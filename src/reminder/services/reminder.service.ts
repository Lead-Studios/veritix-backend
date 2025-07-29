import { Injectable, NotFoundException, Logger, BadRequestException, type OnModuleInit } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Reminder, ReminderStatus } from "../entities/reminder.entity"
import type { CreateReminderDto, UpdateReminderDto } from "../dto/reminder.dto"
import type { ReminderSchedulerService } from "./reminder-scheduler.service"
import type { EventService } from "./event.service"

@Injectable()
export class ReminderService implements OnModuleInit {
  private readonly logger = new Logger(ReminderService.name)

  constructor(
    private reminderRepository: Repository<Reminder>,
    private reminderSchedulerService: ReminderSchedulerService,
    private eventService: EventService, // To validate event existence and get start time
  ) {}

  /**
   * Called once the module has been initialized.
   * Re-schedules any active reminders that might have been missed due to server restarts.
   */
  async onModuleInit() {
    this.logger.log("Re-scheduling active reminders on module initialization...")
    const activeReminders = await this.reminderRepository.find({
      where: { status: ReminderStatus.ACTIVE },
    })

    for (const reminder of activeReminders) {
      await this.reminderSchedulerService.scheduleReminder(reminder, this.updateReminderStatus.bind(this))
    }
    this.logger.log(`Finished re-scheduling ${activeReminders.length} active reminders.`)
  }

  /**
   * Creates a new reminder and schedules its job.
   * @param createDto Data for the new reminder.
   * @param organizerId The ID of the organizer creating the reminder.
   * @returns The created Reminder entity.
   */
  async createReminder(createDto: CreateReminderDto, organizerId: string): Promise<Reminder> {
    // Validate event existence and get its start time
    try {
      await this.eventService.getEventStartTime(createDto.eventId)
    } catch (error) {
      throw new BadRequestException(`Event with ID ${createDto.eventId} not found or invalid.`)
    }

    const reminder = this.reminderRepository.create({
      ...createDto,
      organizerId,
      status: ReminderStatus.ACTIVE,
    })

    const savedReminder = await this.reminderRepository.save(reminder)
    this.logger.log(`Created reminder ${savedReminder.id} for event ${savedReminder.eventId}.`)

    await this.reminderSchedulerService.scheduleReminder(savedReminder, this.updateReminderStatus.bind(this))

    return savedReminder
  }

  /**
   * Updates an existing reminder and re-schedules its job if necessary.
   * @param id The ID of the reminder to update.
   * @param updateDto Data to update.
   * @returns The updated Reminder entity.
   */
  async updateReminder(id: string, updateDto: UpdateReminderDto): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({ where: { id } })

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found.`)
    }

    // Prevent updates if reminder has already been triggered or failed
    if ([ReminderStatus.TRIGGERED, ReminderStatus.FAILED, ReminderStatus.CANCELLED].includes(reminder.status)) {
      throw new BadRequestException(`Cannot update a reminder with status ${reminder.status}.`)
    }

    const oldOffsetMinutes = reminder.offsetMinutes
    const oldType = reminder.type
    const oldStatus = reminder.status

    Object.assign(reminder, updateDto)

    const updatedReminder = await this.reminderRepository.save(reminder)
    this.logger.log(`Updated reminder ${updatedReminder.id}.`)

    // Re-schedule if offsetMinutes, type, or status changed
    if (
      updatedReminder.offsetMinutes !== oldOffsetMinutes ||
      updatedReminder.type !== oldType ||
      updatedReminder.status !== oldStatus
    ) {
      if (updatedReminder.status === ReminderStatus.ACTIVE) {
        await this.reminderSchedulerService.scheduleReminder(updatedReminder, this.updateReminderStatus.bind(this))
      } else {
        // If status changed to INACTIVE or CANCELLED, cancel the job
        this.reminderSchedulerService.cancelReminder(updatedReminder.id)
      }
    }

    return updatedReminder
  }

  /**
   * Deletes a reminder and cancels its scheduled job.
   * @param id The ID of the reminder to delete.
   */
  async deleteReminder(id: string): Promise<void> {
    const reminder = await this.reminderRepository.findOne({ where: { id } })

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found.`)
    }

    this.reminderSchedulerService.cancelReminder(id) // Cancel the job first

    await this.reminderRepository.remove(reminder)
    this.logger.log(`Deleted reminder ${id}.`)
  }

  /**
   * Finds a single reminder by its ID.
   * @param id The ID of the reminder.
   * @returns The Reminder entity.
   */
  async findOne(id: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({ where: { id } })
    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found.`)
    }
    return reminder
  }

  /**
   * Finds all reminders, optionally filtered by eventId or organizerId.
   * @param eventId Optional event ID to filter by.
   * @param organizerId Optional organizer ID to filter by.
   * @returns An array of Reminder entities.
   */
  async findAll(eventId?: string, organizerId?: string): Promise<Reminder[]> {
    const where: any = {}
    if (eventId) {
      where.eventId = eventId
    }
    if (organizerId) {
      where.organizerId = organizerId
    }
    return this.reminderRepository.find({ where, order: { createdAt: "ASC" } })
  }

  /**
   * Internal method to update a reminder's status in the database.
   * Used by ReminderSchedulerService after job execution.
   * @param id The ID of the reminder.
   * @param status The new status.
   * @param triggeredAt Optional timestamp for when it was triggered.
   */
  async updateReminderStatus(id: string, status: ReminderStatus, triggeredAt?: Date): Promise<void> {
    await this.reminderRepository.update(id, { status, lastTriggeredAt: triggeredAt || null })
    this.logger.debug(`Updated status of reminder ${id} to ${status}.`)
  }
}
