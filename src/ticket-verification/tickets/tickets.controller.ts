import { Controller, Get, Post, Param, Body, UseGuards, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { TicketsService } from "./tickets.service"
import type { IssueTicketDto, TransferTicketDto } from "./dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { Role } from "../auth/enums/role.enum"

@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get("verify/:ticketId")
  @ApiOperation({ summary: "Verify a ticket on the blockchain" })
  @ApiResponse({
    status: 200,
    description: "Ticket verification result",
    schema: {
      example: {
        valid: true,
        ticketId: "0x123abc",
        event: "Web3 Conference 2025",
        owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        seat: "VIP Section A, Row 1, Seat 5",
        resalable: true,
        issuedAt: "2025-04-15T18:00:00Z",
      },
    },
  })
  @ApiResponse({ status: 404, description: "Ticket not found" })
  async verifyTicket(@Param("ticketId") ticketId: string) {
    try {
      const result = await this.ticketsService.verifyTicket(ticketId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to verify ticket",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("issue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EVENT_ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Issue a new ticket on the blockchain" })
  @ApiResponse({
    status: 201,
    description: "Ticket issued successfully",
    schema: {
      example: {
        success: true,
        ticketId: "TIX-0x71C765-EVENT123-1234567890",
        owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        event: "Web3 Conference 2025",
        seat: "VIP Section A, Row 1, Seat 5",
        resalable: true,
        issuedAt: "2025-04-15T18:00:00Z",
      },
    },
  })
  async issueTicket(@Body() issueTicketDto: IssueTicketDto) {
    try {
      const result = await this.ticketsService.issueTicket(issueTicketDto);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to issue ticket",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("transfer")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Transfer a ticket to a new owner" })
  @ApiResponse({
    status: 200,
    description: "Ticket transferred successfully",
    schema: {
      example: {
        success: true,
        ticketId: "0x123abc",
        newOwner: "0x89D35C32d1Cd34F7e4a397D32d73183a9755F535",
        transferredAt: "2025-04-15T18:00:00Z",
      },
    },
  })
  async transferTicket(@Body() transferTicketDto: TransferTicketDto) {
    try {
      const result =
        await this.ticketsService.transferTicket(transferTicketDto);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to transfer ticket",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("owner/:address")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all tickets owned by an address" })
  @ApiResponse({
    status: 200,
    description: "List of tickets owned by the address",
  })
  async getOwnerTickets(@Param("address") address: string) {
    try {
      const tickets = await this.ticketsService.getOwnerTickets(address);
      return tickets;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to get owner tickets",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("event/:eventId")
  @ApiOperation({ summary: "Get all tickets for an event" })
  @ApiResponse({ status: 200, description: "List of tickets for the event" })
  async getEventTickets(@Param("eventId") eventId: string) {
    try {
      const tickets = await this.ticketsService.getEventTickets(eventId);
      return tickets;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to get event tickets",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

