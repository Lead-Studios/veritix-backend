import { Injectable, Logger, NotFoundException, BadRequestException, type OnModuleInit } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type TicketHold, TicketHoldStatus } from "../entities/ticket-hold.entity"
import type { CreateTicketHoldDto } from "../dto/ticket-hold.dto"
import type { TicketInventoryService } from "./ticket-inventory.service"
import type { TicketHoldGateway } from "../gateways/ticket-hold.gateway"

@Injectable()
export class TicketHoldService implements OnModuleInit {
  private readonly logger = new Logger(TicketHoldService.name)
  private holdTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private ticketHoldRepository: Repository<TicketHold>,
    private ticketInventoryService: TicketInventoryService,
    private ticketHoldGateway: TicketHoldGateway,
  ) {}

  /**
   * Called once the module has been initialized.
   * Re-schedules any active holds that might have been missed due to server restarts.
   */
  async onModuleInit() {
    this.logger.log("Re-scheduling active ticket holds on module initialization...")
    const activeHolds = await this.ticketHoldRepository.find({
      where: { status: TicketHoldStatus.ACTIVE },
    })

    for (const hold of activeHolds) {
      const now = new Date()
      if (hold.expiresAt > now) {
        // Hold is still valid, re-schedule the timeout
        this.scheduleHoldExpiration(hold)
        this.logger.debug(`Re-scheduled hold ${hold.id} for expiration at ${hold.expiresAt.toISOString()}`)
      } else {
        // Hold has already expired, process it immediately
        this.logger.warn(`Hold ${hold.id} found in ACTIVE status but already expired. Processing expiration now.`)
        await this.processHoldExpiration(hold.id)
      }
    }
    this.logger.log(`Finished re-scheduling ${activeHolds.length} active ticket holds.`)
  }

  /**
   * Creates a new ticket hold.
   * @param createDto Data for the new ticket hold.
   * @param userId The ID of the user initiating the hold.
   * @returns The created TicketHold entity.
   */
  async createHold(createDto: CreateTicketHoldDto, userId: string): Promise<TicketHold> {
    const { eventId, ticketTypeId, quantity, holdDurationMinutes } = createDto

    // 1. Check available inventory
    const available = this.ticketInventoryService.getAvailableTickets(ticketTypeId)
    if (available < quantity) {
      throw new BadRequestException(
        `Not enough tickets available for type ${ticketTypeId}. Available: ${available}, Requested: ${quantity}`,
      )
    }

    // 2. Decrement inventory (optimistic lock/transaction in real app)
    this.ticketInventoryService.decrementTickets(ticketTypeId, quantity)

    // 3. Create hold record
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000)
    const ticketHold = this.ticketHoldRepository.create({
      eventId,
      ticketTypeId,
      quantity,
      userId,
      expiresAt,
      status: TicketHoldStatus.ACTIVE,
    })

    const savedHold = await this.ticketHoldRepository.save(ticketHold)
    this.logger.log(
      `Created ticket hold ${savedHold.id} for ${quantity} of ${ticketTypeId}, expires at ${expiresAt.toISOString()}`,
    )

    // 4. Schedule expiration
    this.scheduleHoldExpiration(savedHold)

    return savedHold
  }

  /**
   * Confirms a ticket hold, typically after a successful payment.
   * This prevents the tickets from being re-released.
   * @param holdId The ID of the hold to confirm.
   * @returns The confirmed TicketHold entity.
   */
  async confirmHold(holdId: string): Promise<TicketHold> {
    const hold = await this.ticketHoldRepository.findOne({ where: { id: holdId } })

    if (!hold) {
      throw new NotFoundException(`Ticket hold with ID ${holdId} not found.`)
    }
    if (hold.status !== TicketHoldStatus.ACTIVE) {
      throw new BadRequestException(`Cannot confirm hold ${holdId} with status ${hold.status}.`)
    }

    // Clear the expiration timeout
    this.clearHoldTimeout(holdId)

    hold.status = TicketHoldStatus.CONFIRMED
    const confirmedHold = await this.ticketHoldRepository.save(hold)
    this.logger.log(`Confirmed ticket hold ${holdId}. Tickets are now sold.`)

    // In a real app, this is where you'd finalize the sale,
    // e.g., create actual ticket instances, assign to user, etc.
    // The inventory decrement already happened at hold creation.

    return confirmedHold
  }

  /**
   * Explicitly cancels a ticket hold, re-releasing tickets.
   * This might be called if a user cancels checkout before expiration.
   * @param holdId The ID of the hold to cancel.
   */
  async cancelHold(holdId: string): Promise<void> {
    const hold = await this.ticketHoldRepository.findOne({ where: { id: holdId } })

    if (!hold) {
      throw new NotFoundException(`Ticket hold with ID ${holdId} not found.`)
    }
    if (hold.status !== TicketHoldStatus.ACTIVE) {
      throw new BadRequestException(`Cannot cancel hold ${holdId} with status ${hold.status}.`)
    }

    // Clear the expiration timeout
    this.clearHoldTimeout(holdId)

    // Re-release tickets to inventory
    this.ticketInventoryService.incrementTickets(hold.ticketTypeId, hold.quantity)
    this.ticketHoldGateway.emitTicketReReleased(hold.eventId, hold.ticketTypeId, hold.quantity)
    this.logger.log(
      `Cancelled ticket hold ${holdId}. Re-released ${hold.quantity} tickets of type ${hold.ticketTypeId}.`,
    )

    hold.status = TicketHoldStatus.CANCELLED
    await this.ticketHoldRepository.save(hold)
  }

  /**
   * Retrieves a single ticket hold by ID.
   * @param id The ID of the ticket hold.
   * @returns The TicketHold entity.
   */
  async getHold(id: string): Promise<TicketHold> {
    const hold = await this.ticketHoldRepository.findOne({ where: { id } })
    if (!hold) {
      throw new NotFoundException(`Ticket hold with ID ${id} not found.`)
    }
    return hold
  }

  /**
   * Retrieves all ticket holds for a given event, optionally filtered by status.
   * @param eventId The ID of the event.
   * @param status Optional status to filter by.
   * @returns An array of TicketHold entities.
   */
  async getHoldsByEvent(eventId: string, status?: TicketHoldStatus): Promise<TicketHold[]> {
    const where: any = { eventId }
    if (status) {
      where.status = status
    }
    return this.ticketHoldRepository.find({ where, order: { createdAt: "DESC" } })
  }

  /**
   * Schedules a timeout for a ticket hold's expiration.
   * @param hold The TicketHold entity.
   */
  private scheduleHoldExpiration(hold: TicketHold) {
    const delay = hold.expiresAt.getTime() - Date.now()
    if (delay <= 0) {
      // If already expired or invalid delay, process immediately
      this.logger.warn(`Hold ${hold.id} has an invalid or past expiration time. Processing immediately.`)
      this.processHoldExpiration(hold.id)
      return
    }

    const timeout = setTimeout(() => {
      this.processHoldExpiration(hold.id)
    }, delay)

    this.holdTimeouts.set(hold.id, timeout)
    this.logger.debug(`Scheduled expiration for hold ${hold.id} in ${delay / 1000} seconds.`)
  }

  /**
   * Clears the scheduled timeout for a specific hold.
   * @param holdId The ID of the hold.
   */
  private clearHoldTimeout(holdId: string) {
    const timeout = this.holdTimeouts.get(holdId)
    if (timeout) {
      clearTimeout(timeout)
      this.holdTimeouts.delete(holdId)
      this.logger.debug(`Cleared expiration timeout for hold ${holdId}.`)
    }
  }

  /**
   * Processes the expiration of a ticket hold.
   * This method is called when the scheduled timeout fires.
   * @param holdId The ID of the hold to process.
   */
  private async processHoldExpiration(holdId: string) {
    const hold = await this.ticketHoldRepository.findOne({ where: { id: holdId } })

    if (!hold) {
      this.logger.warn(`Attempted to process expiration for non-existent hold ${holdId}.`)
      return
    }

    if (hold.status === TicketHoldStatus.ACTIVE) {
      this.logger.log(`Hold ${holdId} expired. Re-releasing tickets.`)
      // Re-release tickets to inventory
      this.ticketInventoryService.incrementTickets(hold.ticketTypeId, hold.quantity)
      this.ticketHoldGateway.emitTicketReReleased(hold.eventId, hold.ticketTypeId, hold.quantity)

      hold.status = TicketHoldStatus.EXPIRED
      await this.ticketHoldRepository.save(hold)
    } else {
      this.logger.debug(`Hold ${holdId} is no longer active (status: ${hold.status}). No action needed.`)
    }
    this.holdTimeouts.delete(holdId) // Ensure timeout is removed from map
  }
}
