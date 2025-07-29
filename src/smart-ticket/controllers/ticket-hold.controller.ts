import { Controller, Post, Get, Delete, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { TicketHoldService } from "../services/ticket-hold.service"
import { type CreateTicketHoldDto, TicketHoldDto } from "../dto/ticket-hold.dto"
import { TicketHoldStatus } from "../entities/ticket-hold.entity"

@ApiTags("Smart Ticket Holds")
@Controller("ticket-holds")
export class TicketHoldController {
  constructor(private readonly ticketHoldService: TicketHoldService) {}

  @Post()
  @ApiOperation({ summary: "Create a time-limited hold for tickets" })
  @ApiResponse({
    status: 201,
    description: "Tickets held successfully",
    type: TicketHoldDto,
  })
  @ApiResponse({ status: 400, description: "Not enough tickets available or invalid data" })
  async createHold(createDto: CreateTicketHoldDto): Promise<TicketHoldDto> {
    // In a real application, you would get the user ID from the authentication context
    const userId = "checkout-user-id-789" // Replace with actual user ID from auth
    return this.ticketHoldService.createHold(createDto, userId)
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm a ticket hold (e.g., after successful payment)" })
  @ApiResponse({
    status: 200,
    description: "Ticket hold confirmed",
    type: TicketHoldDto,
  })
  @ApiResponse({ status: 404, description: "Ticket hold not found" })
  @ApiResponse({ status: 400, description: "Hold is not in active status" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the ticket hold to confirm" })
  async confirmHold(@Param("id", ParseUUIDPipe) id: string): Promise<TicketHoldDto> {
    return this.ticketHoldService.confirmHold(id)
  }

  @Delete(":id/cancel")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Explicitly cancel a ticket hold and re-release tickets" })
  @ApiResponse({ status: 204, description: "Ticket hold cancelled and tickets re-released" })
  @ApiResponse({ status: 404, description: "Ticket hold not found" })
  @ApiResponse({ status: 400, description: "Hold is not in active status" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the ticket hold to cancel" })
  async cancelHold(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.ticketHoldService.cancelHold(id)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get details of a specific ticket hold" })
  @ApiResponse({
    status: 200,
    description: "Ticket hold details retrieved successfully",
    type: TicketHoldDto,
  })
  @ApiResponse({ status: 404, description: "Ticket hold not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the ticket hold" })
  async getHold(@Param("id", ParseUUIDPipe) id: string): Promise<TicketHoldDto> {
    return this.ticketHoldService.getHold(id)
  }

  @Get("event/:eventId")
  @ApiOperation({ summary: "Get all ticket holds for a specific event" })
  @ApiResponse({
    status: 200,
    description: "List of ticket holds retrieved successfully",
    type: [TicketHoldDto],
  })
  @ApiParam({ name: "eventId", type: "string", description: "ID of the event" })
  @ApiQuery({
    name: "status",
    enum: TicketHoldStatus,
    required: false,
    description: "Filter holds by status",
  })
  async getHoldsByEvent(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Query("status") status?: TicketHoldStatus,
  ): Promise<TicketHoldDto[]> {
    return this.ticketHoldService.getHoldsByEvent(eventId, status)
  }
}
