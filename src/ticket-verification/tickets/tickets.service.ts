import { Injectable, HttpException, HttpStatus } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { BlockchainService } from "../blockchain/blockchain.service"
import type { IssueTicketDto, TransferTicketDto } from "./dto"
import type { Ticket, VerificationResult } from "./interfaces"

@Injectable()
export class TicketsService {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {}

  async verifyTicket(ticketId: string): Promise<VerificationResult> {
    try {
      // Call blockchain service to verify the ticket
      const isValid = await this.blockchainService.verifyTicket(ticketId)

      if (!isValid) {
        throw new HttpException("Ticket not found on blockchain", HttpStatus.NOT_FOUND)
      }

      // Get ticket details from blockchain
      const ticketInfo = await this.blockchainService.getTicketInfo(ticketId)

      return {
        valid: true,
        ticketId,
        event: ticketInfo.eventId,
        owner: ticketInfo.owner,
        seat: ticketInfo.seat,
        resalable: ticketInfo.isResalable,
        issuedAt: new Date(Number(ticketInfo.issuedAt) * 1000).toISOString(),
        metadata: {
          eventId: ticketInfo.eventId,
          venue: await this.getEventVenue(ticketInfo.eventId),
          date: await this.getEventDate(ticketInfo.eventId),
        },
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      console.error("Error verifying ticket:", error)
      throw new HttpException("Failed to verify ticket on blockchain", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async issueTicket(issueTicketDto: IssueTicketDto): Promise<any> {
    try {
      const { to, eventId, seat, resalable } = issueTicketDto

      // Call blockchain service to issue the ticket
      const result = await this.blockchainService.issueTicket(to, eventId, seat, resalable)

      return {
        success: true,
        ticketId: result.ticketId,
        owner: to,
        event: eventId,
        seat: seat || "General Admission",
        resalable: resalable !== undefined ? resalable : true,
        issuedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error issuing ticket:", error)
      throw new HttpException("Failed to issue ticket on blockchain", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async transferTicket(transferTicketDto: TransferTicketDto): Promise<any> {
    try {
      const { ticketId, newOwner } = transferTicketDto

      // Verify the ticket exists and is resalable
      const ticketInfo = await this.blockchainService.getTicketInfo(ticketId)

      if (!ticketInfo.isValid) {
        throw new HttpException("Ticket not found on blockchain", HttpStatus.NOT_FOUND)
      }

      if (!ticketInfo.isResalable) {
        throw new HttpException("Ticket is not resalable", HttpStatus.BAD_REQUEST)
      }

      // Call blockchain service to transfer the ticket
      await this.blockchainService.transferTicket(ticketId, newOwner)

      return {
        success: true,
        ticketId,
        newOwner,
        transferredAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      console.error("Error transferring ticket:", error)
      throw new HttpException("Failed to transfer ticket on blockchain", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async getOwnerTickets(address: string): Promise<Ticket[]> {
    try {
      // Call blockchain service to get tickets owned by address
      const ticketIds = await this.blockchainService.getOwnerTickets(address)

      // Get details for each ticket
      const tickets = await Promise.all(
        ticketIds.map(async (id: string) => {
          const info = await this.blockchainService.getTicketInfo(id)
          return {
            ticketId: id,
            event: info.eventId,
            seat: info.seat,
            resalable: info.isResalable,
            issuedAt: new Date(Number(info.issuedAt) * 1000).toISOString(),
          }
        }),
      )

      return tickets
    } catch (error) {
      console.error("Error getting owner tickets:", error)
      throw new HttpException("Failed to get owner tickets from blockchain", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async getEventTickets(eventId: string): Promise<Ticket[]> {
    try {
      // Call blockchain service to get tickets for event
      const ticketIds = await this.blockchainService.getEventTickets(eventId)

      // Get details for each ticket
      const tickets = await Promise.all(
        ticketIds.map(async (id: string) => {
          const info = await this.blockchainService.getTicketInfo(id)
          return {
            ticketId: id,
            owner: info.owner,
            seat: info.seat,
            resalable: info.isResalable,
            issuedAt: new Date(Number(info.issuedAt) * 1000).toISOString(),
          }
        }),
      )

      return tickets
    } catch (error) {
      console.error("Error getting event tickets:", error)
      throw new HttpException("Failed to get event tickets from blockchain", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // Helper methods to get additional event information
  // In a real application, these would likely come from a database
  private async getEventVenue(eventId: string): Promise<string> {
    // Mock implementation - in a real app, this would query a database
    const eventVenues = {
      EVENT_123: "Blockchain Arena",
      EVENT_456: "Web3 Stadium",
      EVENT_789: "Crypto Convention Center",
    }

    return eventVenues[eventId] || "Unknown Venue"
  }

  private async getEventDate(eventId: string): Promise<string> {
    // Mock implementation - in a real app, this would query a database
    const eventDates = {
      EVENT_123: "2025-04-15T18:00:00Z",
      EVENT_456: "2025-05-20T19:30:00Z",
      EVENT_789: "2025-06-10T17:00:00Z",
    }

    return eventDates[eventId] || new Date().toISOString()
  }
}

