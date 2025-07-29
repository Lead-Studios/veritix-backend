import { Injectable, NotFoundException, Logger, BadRequestException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ScheduledEvent, ScheduledEventStatus } from "../entities/scheduled-event.entity"
import type { CreateScheduledEventDto, UpdateScheduledEventDto } from "../dto/scheduled-event.dto"
import type { SchedulerService } from "./scheduler.service"
import type { EventPublisherService } from "./event-publisher.service"

@Injectable()
export class ScheduledEventService {
  private readonly logger = new Logger(ScheduledEventService.name)

  constructor(
    private scheduledEventRepository: Repository<ScheduledEvent>,
    private schedulerService: SchedulerService,
    private eventPublisherService: EventPublisherService,
  ) {}

  /**
   * Creates a new scheduled event and schedules its publication.
   * @param createDto Data for the new scheduled event.
   * @param userId The ID of the user scheduling the event.
   * @returns The created ScheduledEvent entity.
   */
  async create(createDto: CreateScheduledEventDto, userId: string): Promise<ScheduledEvent> {
    const publishAtDate = new Date(createDto.publishAt)

    if (publishAtDate <= new Date()) {
      throw new BadRequestException("Publication date must be in the future.")
    }

    const scheduledEvent = this.scheduledEventRepository.create({
      ...createDto,
      publishAt: publishAtDate,
      scheduledBy: userId,
      status: ScheduledEventStatus.PENDING,
    })

    const savedEvent = await this.scheduledEventRepository.save(scheduledEvent)

    this.schedulePublicationJob(savedEvent)

    return savedEvent
  }

  /**
   * Updates an existing scheduled event and re-schedules its publication if needed.
   * @param id The ID of the scheduled event to update.
   * @param updateDto Data to update.
   * @returns The updated ScheduledEvent entity.
   */
  async update(id: string, updateDto: UpdateScheduledEventDto): Promise<ScheduledEvent> {
    const scheduledEvent = await this.scheduledEventRepository.findOne({ where: { id } })

    if (!scheduledEvent) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found.`)
    }

    if (scheduledEvent.status !== ScheduledEventStatus.PENDING) {
      throw new BadRequestException(`Cannot update a scheduled event with status ${scheduledEvent.status}.`)
    }

    if (updateDto.publishAt) {
      const newPublishAtDate = new Date(updateDto.publishAt)
      if (newPublishAtDate <= new Date()) {
        throw new BadRequestException("New publication date must be in the future.")
      }

      // Remove old job
      this.schedulerService.deleteCronJob(`publish-event-${scheduledEvent.id}`)

      scheduledEvent.publishAt = newPublishAtDate
    }

    Object.assign(scheduledEvent, updateDto)
    const updatedEvent = await this.scheduledEventRepository.save(scheduledEvent)

    // Re-schedule with updated time
    this.schedulePublicationJob(updatedEvent)

    return updatedEvent
  }

  /**
   * Cancels a scheduled event, removing its job from the scheduler.
   * @param id The ID of the scheduled event to cancel.
   */
  async cancel(id: string): Promise<void> {
    const scheduledEvent = await this.scheduledEventRepository.findOne({ where: { id } })

    if (!scheduledEvent) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found.`)
    }

    if (scheduledEvent.status !== ScheduledEventStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel a scheduled event with status ${scheduledEvent.status}.`)
    }

    this.schedulerService.deleteCronJob(`publish-event-${scheduledEvent.id}`)

    scheduledEvent.status = ScheduledEventStatus.CANCELLED
    await this.scheduledEventRepository.save(scheduledEvent)
  }

  /**
   * Finds a single scheduled event by its ID.
   * @param id The ID of the scheduled event.
   * @returns The ScheduledEvent entity.
   */
  async findOne(id: string): Promise<ScheduledEvent> {
    const scheduledEvent = await this.scheduledEventRepository.findOne({ where: { id } })
    if (!scheduledEvent) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found.`)
    }
    return scheduledEvent
  }

  /**
   * Finds all scheduled events, optionally filtered by eventId.
   * @param eventId Optional event ID to filter by.
   * @returns An array of ScheduledEvent entities.
   */
  async findAll(eventId?: string): Promise<ScheduledEvent[]> {
    const query: any = {}
    if (eventId) {
      query.eventId = eventId
    }
    return this.scheduledEventRepository.find({ where: query, order: { publishAt: "ASC" } })
  }

  /**
   * Internal method to schedule the actual CRON job.
   * @param scheduledEvent The ScheduledEvent entity to schedule.
   */
  private schedulePublicationJob(scheduledEvent: ScheduledEvent) {
    const jobName = `publish-event-${scheduledEvent.id}`
    const publishAt = scheduledEvent.publishAt

    this.schedulerService.addCronJob(jobName, publishAt, async () => {
      this.logger.log(`Executing scheduled publication for event ${scheduledEvent.eventId} (ID: ${scheduledEvent.id})`)
      try {
        await this.eventPublisherService.publishEvent(scheduledEvent.eventId)
        scheduledEvent.status = ScheduledEventStatus.PUBLISHED
        scheduledEvent.publishedAt = new Date()
        await this.scheduledEventRepository.save(scheduledEvent)
        this.logger.log(`Event ${scheduledEvent.eventId} successfully published.`)
      } catch (error) {
        scheduledEvent.status = ScheduledEventStatus.FAILED
        this.logger.error(
          `Failed to publish event ${scheduledEvent.eventId} (ID: ${scheduledEvent.id}): ${error.message}`,
          error.stack,
        )
        await this.scheduledEventRepository.save(scheduledEvent)
      } finally {
        // Optionally delete the job after execution if it's a one-time job
        this.schedulerService.deleteCronJob(jobName)
      }
    })
  }

  /**
   * This method should be called on application startup to re-schedule any PENDING jobs
   * that might have been missed due to server restarts.
   */
  async onApplicationBootstrap() {
    this.logger.log("Re-scheduling pending events on application bootstrap...")
    const pendingEvents = await this.scheduledEventRepository.find({
      where: { status: ScheduledEventStatus.PENDING },
    })

    for (const event of pendingEvents) {
      // Only re-schedule if the publishAt time is in the future
      if (event.publishAt > new Date()) {
        this.schedulePublicationJob(event)
        this.logger.debug(`Re-scheduled event ${event.id} for ${event.publishAt.toISOString()}`)
      } else {
        // If publishAt is in the past, mark as failed or attempt immediate publication
        this.logger.warn(
          `Event ${event.id} was pending but its publish time ${event.publishAt.toISOString()} is in the past. Marking as FAILED.`,
        )
        event.status = ScheduledEventStatus.FAILED
        await this.scheduledEventRepository.save(event)
      }
    }
    this.logger.log(`Finished re-scheduling ${pendingEvents.length} pending events.`)
  }
}
