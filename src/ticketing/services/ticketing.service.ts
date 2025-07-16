import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { TicketingEvent } from "../entities/event.entity"
import { TicketingTicket, TicketStatus } from "../entities/ticket.entity"
import { QrCodeService } from "./qr-code.service"
import { PurchaseTicketDto } from "../dto/purchase-ticket.dto"
import { ScanTicketDto } from "../dto/scan-ticket.dto"
import { TicketResponseDto, ScanResultDto, PurchaseResponseDto } from "../dto/ticket-response.dto"

@Injectable()
export class TicketingService {
  constructor(
    @InjectRepository(TicketingEvent)
    private eventRepository: Repository<TicketingEvent>,
    @InjectRepository(TicketingTicket)
    private ticketRepository: Repository<TicketingTicket>,
    private qrCodeService: QrCodeService,
  ) {}

  /**
   * Purchase tickets for an event
   */
  async purchaseTickets(purchaseData: PurchaseTicketDto): Promise<PurchaseResponseDto> {
    const { eventId, purchaserId, purchaserName, purchaserEmail, quantity = 1 } = purchaseData

    // Validate event exists and is active
    const event = await this.eventRepository.findOne({
      where: { id: eventId, isActive: true },
    })

    if (!event) {
      throw new NotFoundException("Event not found or is not active")
    }

    // Check if event has started
    if (new Date() > event.endDate) {
      throw new BadRequestException("Cannot purchase tickets for past events")
    }

    // Check capacity
    const existingTickets = await this.ticketRepository.count({
      where: { eventId, status: TicketStatus.ACTIVE },
    })

    if (existingTickets + quantity > event.maxCapacity) {
      throw new BadRequestException("Not enough tickets available")
    }

    // Generate tickets
    const tickets: TicketingTicket[] = []
    const totalAmount = event.ticketPrice * quantity

    for (let i = 0; i < quantity; i++) {
      const ticketNumber = this.qrCodeService.generateTicketNumber(eventId)

      // Create ticket entity first to get ID
      const ticket = this.ticketRepository.create({
        ticketNumber,
        eventId,
        purchaserId,
        purchaserName,
        purchaserEmail,
        pricePaid: event.ticketPrice,
        purchaseDate: new Date(),
        status: TicketStatus.ACTIVE,
        qrCodeData: "", // Will be updated after QR generation
        qrCodeImage: "",
        secureHash: "",
      })

      const savedTicket = await this.ticketRepository.save(ticket)

      // Generate QR code with the actual ticket ID
      const qrCodeResult = await this.qrCodeService.generateQrCode(savedTicket.id, eventId, purchaserId)

      // Update ticket with QR code data
      savedTicket.qrCodeData = qrCodeResult.qrCodeData
      savedTicket.qrCodeImage = qrCodeResult.qrCodeImage
      savedTicket.secureHash = qrCodeResult.secureHash

      const finalTicket = await this.ticketRepository.save(savedTicket)
      tickets.push(finalTicket)
    }

    // Convert to response DTOs
    const ticketResponses: TicketResponseDto[] = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.eventId,
      eventName: event.name,
      purchaserName: ticket.purchaserName,
      purchaserEmail: ticket.purchaserEmail,
      qrCodeImage: ticket.qrCodeImage,
      status: ticket.status,
      pricePaid: ticket.pricePaid,
      purchaseDate: ticket.purchaseDate,
    }))

    return {
      success: true,
      message: `Successfully purchased ${quantity} ticket(s)`,
      tickets: ticketResponses,
      totalAmount,
    }
  }

  /**
   * Scan and validate a QR code
   */
  async scanTicket(scanData: ScanTicketDto): Promise<ScanResultDto> {
    const { qrCodeData, scannedBy, eventId } = scanData

    // Verify QR code integrity
    const verification = this.qrCodeService.verifyQrCode(qrCodeData)

    if (!verification.isValid) {
      return {
        success: false,
        message: "Invalid QR code",
        error: verification.error,
      }
    }

    const { payload } = verification

    // Find the ticket
    const ticket = await this.ticketRepository.findOne({
      where: { id: payload.ticketId },
      relations: ["event"],
    })

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
        error: "Ticket does not exist in the system",
      }
    }

    // Verify event ID matches if provided
    if (eventId && ticket.eventId !== eventId) {
      return {
        success: false,
        message: "Ticket is not valid for this event",
        error: "Event ID mismatch",
      }
    }

    // Check if ticket is already used
    if (ticket.status === TicketStatus.USED) {
      return {
        success: false,
        message: "Ticket has already been used",
        error: `Ticket was previously scanned on ${ticket.usedAt?.toISOString()}`,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          eventName: ticket.event.name,
          purchaserName: ticket.purchaserName,
          status: ticket.status,
          usedAt: ticket.usedAt,
        },
      }
    }

    // Check if ticket is cancelled or expired
    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        success: false,
        message: "Ticket has been cancelled",
        error: "This ticket is no longer valid",
      }
    }

    if (ticket.status === TicketStatus.EXPIRED) {
      return {
        success: false,
        message: "Ticket has expired",
        error: "This ticket is no longer valid",
      }
    }

    // Check if event has ended
    if (new Date() > ticket.event.endDate) {
      return {
        success: false,
        message: "Event has ended",
        error: "Cannot scan tickets for past events",
      }
    }

    // Mark ticket as used
    ticket.status = TicketStatus.USED
    ticket.usedAt = new Date()
    ticket.scannedBy = scannedBy

    await this.ticketRepository.save(ticket)

    return {
      success: true,
      message: "Ticket successfully validated",
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        eventName: ticket.event.name,
        purchaserName: ticket.purchaserName,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ["event"],
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.eventId,
      eventName: ticket.event.name,
      purchaserName: ticket.purchaserName,
      purchaserEmail: ticket.purchaserEmail,
      qrCodeImage: ticket.qrCodeImage,
      status: ticket.status,
      pricePaid: ticket.pricePaid,
      purchaseDate: ticket.purchaseDate,
      usedAt: ticket.usedAt,
      scannedBy: ticket.scannedBy,
    }
  }

  /**
   * Get tickets by purchaser
   */
  async getTicketsByPurchaser(purchaserId: string): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { purchaserId },
      relations: ["event"],
      order: { purchaseDate: "DESC" },
    })

    return tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.eventId,
      eventName: ticket.event.name,
      purchaserName: ticket.purchaserName,
      purchaserEmail: ticket.purchaserEmail,
      qrCodeImage: ticket.qrCodeImage,
      status: ticket.status,
      pricePaid: ticket.pricePaid,
      purchaseDate: ticket.purchaseDate,
      usedAt: ticket.usedAt,
      scannedBy: ticket.scannedBy,
    }))
  }

  /**
   * Get tickets by event (for organizers)
   */
  async getTicketsByEvent(eventId: string, organizerId: string): Promise<TicketResponseDto[]> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    })

    if (!event) {
      throw new ForbiddenException("You don't have permission to view tickets for this event")
    }

    const tickets = await this.ticketRepository.find({
      where: { eventId },
      relations: ["event"],
      order: { purchaseDate: "DESC" },
    })

    return tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.eventId,
      eventName: ticket.event.name,
      purchaserName: ticket.purchaserName,
      purchaserEmail: ticket.purchaserEmail,
      qrCodeImage: ticket.qrCodeImage,
      status: ticket.status,
      pricePaid: ticket.pricePaid,
      purchaseDate: ticket.purchaseDate,
      usedAt: ticket.usedAt,
      scannedBy: ticket.scannedBy,
    }))
  }

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ["event"],
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    // Only purchaser or event organizer can cancel
    if (ticket.purchaserId !== requesterId && ticket.event.organizerId !== requesterId) {
      throw new ForbiddenException("You don't have permission to cancel this ticket")
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException("Cannot cancel a ticket that has already been used")
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException("Ticket is already cancelled")
    }

    ticket.status = TicketStatus.CANCELLED
    await this.ticketRepository.save(ticket)

    return {
      success: true,
      message: "Ticket successfully cancelled",
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(
    eventId: string,
    organizerId: string,
  ): Promise<{
    totalTickets: number
    soldTickets: number
    usedTickets: number
    cancelledTickets: number
    revenue: number
    availableCapacity: number
  }> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    })

    if (!event) {
      throw new ForbiddenException("You don't have permission to view stats for this event")
    }

    const tickets = await this.ticketRepository.find({
      where: { eventId },
    })

    const soldTickets = tickets.filter((t) => t.status !== TicketStatus.CANCELLED).length
    const usedTickets = tickets.filter((t) => t.status === TicketStatus.USED).length
    const cancelledTickets = tickets.filter((t) => t.status === TicketStatus.CANCELLED).length
    const revenue = tickets
      .filter((t) => t.status !== TicketStatus.CANCELLED)
      .reduce((sum, ticket) => sum + Number(ticket.pricePaid), 0)

    return {
      totalTickets: tickets.length,
      soldTickets,
      usedTickets,
      cancelledTickets,
      revenue,
      availableCapacity: event.maxCapacity - soldTickets,
    }
  }
}
