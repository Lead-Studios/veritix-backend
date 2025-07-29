import { Controller, Post, Get, Patch, Param, Query } from "@nestjs/common"
import { TicketingService } from "../services/ticketing.service"
import { PurchaseTicketDto } from "../dto/purchase-ticket.dto"
import { ScanTicketDto } from "../dto/scan-ticket.dto"

@Controller("ticketing")
export class TicketingController {
  constructor(private readonly ticketingService: TicketingService) {}

  @Post("purchase")
  async purchaseTickets(purchaseData: PurchaseTicketDto) {
    return this.ticketingService.purchaseTickets(purchaseData)
  }

  @Post("scan")
  async scanTicket(scanData: ScanTicketDto) {
    return this.ticketingService.scanTicket(scanData)
  }

  @Get("ticket/:ticketId")
  async getTicket(@Param("ticketId") ticketId: string) {
    return this.ticketingService.getTicket(ticketId)
  }

  @Get("purchaser/:purchaserId/tickets")
  async getTicketsByPurchaser(@Param("purchaserId") purchaserId: string) {
    return this.ticketingService.getTicketsByPurchaser(purchaserId)
  }

  @Get("event/:eventId/tickets")
  async getTicketsByEvent(@Param("eventId") eventId: string, @Query("organizerId") organizerId: string) {
    return this.ticketingService.getTicketsByEvent(eventId, organizerId)
  }

  @Get("event/:eventId/stats")
  async getEventStats(@Param("eventId") eventId: string, @Query("organizerId") organizerId: string) {
    return this.ticketingService.getEventStats(eventId, organizerId)
  }

  @Patch("ticket/:ticketId/cancel")
  async cancelTicket(@Param("ticketId") ticketId: string, @Query("requesterId") requesterId: string) {
    return this.ticketingService.cancelTicket(ticketId, requesterId)
  }
}
