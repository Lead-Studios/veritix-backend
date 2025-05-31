import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from "@nestjs/swagger"
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard"
import { RolesGuard } from "../../../security/guards/rolesGuard/roles.guard"
import { RoleDecorator } from "../../../security/decorators/roles.decorator"
import { UserRole } from "../../common/enums/users-roles.enum"
import { CreateTicketTierDto } from "../dto/create-ticket-tier.dto"
import { UpdateTicketTierDto } from "../dto/update-ticket-tier.dto"
import { TicketTierResponseDto } from "../dto/ticket-tier-response.dto"
import { TicketTierService } from "../provider/ticket-tier.service"

@ApiTags("Event Ticket Tiers")
@ApiBearerAuth()
@Controller("events/:eventId/ticket-tiers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketTierController {
  constructor(private readonly ticketTierService: TicketTierService) {}

  @Post()
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Create a new ticket tier for an event",
    description:
      "Create a new ticket tier with specific pricing, quantity, and benefits. Only event organizers and admins can create ticket tiers.",
  })
  @ApiParam({
    name: "eventId",
    description: "UUID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    description: "Ticket tier creation payload",
    type: CreateTicketTierDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Ticket tier created successfully",
    type: TicketTierResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data or business rule violation",
    schema: {
      example: {
        statusCode: 400,
        message: "Sale start date must be before sale end date",
        error: "Bad Request",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "User is not authenticated",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "User does not have permission to create ticket tiers for this event",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Event not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Ticket tier with the same name already exists",
    schema: {
      example: {
        statusCode: 409,
        message: 'A ticket tier with the name "VIP Pass" already exists for this event',
        error: "Conflict",
      },
    },
  })
  async createTicketTier(
    @Param('eventId') eventId: string,
    @Body() createTicketTierDto: CreateTicketTierDto,
    @Request() req,
  ): Promise<TicketTierResponseDto> {
    return this.ticketTierService.createTicketTier(eventId, createTicketTierDto, req.user)
  }

  @Get()
  @ApiOperation({
    summary: "Get all ticket tiers for an event",
    description: "Retrieve all ticket tiers associated with a specific event, ordered by sort order and creation date.",
  })
  @ApiParam({
    name: "eventId",
    description: "UUID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "availableOnly",
    description: "Filter to show only available ticket tiers",
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of ticket tiers retrieved successfully",
    type: [TicketTierResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Event not found",
  })
  async getTicketTiers(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('availableOnly') availableOnly?: boolean,
  ): Promise<TicketTierResponseDto[]> {
    if (availableOnly === true) {
      return this.ticketTierService.getAvailableTicketTiers(eventId)
    }
    return this.ticketTierService.getTicketTiersByEvent(eventId)
  }

  @Get(":tierId")
  @ApiOperation({
    summary: "Get a specific ticket tier",
    description: "Retrieve detailed information about a specific ticket tier.",
  })
  @ApiParam({
    name: "eventId",
    description: "UUID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiParam({
    name: "tierId",
    description: "UUID of the ticket tier",
    example: "987fcdeb-51a2-4567-8901-123456789abc",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Ticket tier details retrieved successfully",
    type: TicketTierResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Ticket tier not found",
  })
  async getTicketTier(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
  ): Promise<TicketTierResponseDto> {
    return this.ticketTierService.getTicketTierById(tierId)
  }

  @Put(":tierId")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Update a ticket tier",
    description: "Update an existing ticket tier. Some restrictions apply based on sold tickets.",
  })
  @ApiParam({
    name: "eventId",
    description: "UUID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiParam({
    name: "tierId",
    description: "UUID of the ticket tier",
    example: "987fcdeb-51a2-4567-8901-123456789abc",
  })
  @ApiBody({
    description: "Ticket tier update payload",
    type: UpdateTicketTierDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Ticket tier updated successfully",
    type: TicketTierResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid update data or constraint violation",
    schema: {
      example: {
        statusCode: 400,
        message: "Cannot reduce total quantity below sold quantity (25)",
        error: "Bad Request",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "User is not authenticated",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "User does not have permission to update this ticket tier",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Ticket tier not found",
  })
  async updateTicketTier(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() updateTicketTierDto: UpdateTicketTierDto,
    @Request() req,
  ): Promise<TicketTierResponseDto> {
    return this.ticketTierService.updateTicketTier(tierId, updateTicketTierDto, req.user)
  }

  @Delete(":tierId")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Delete a ticket tier",
    description: "Delete a ticket tier. Cannot delete tiers with sold tickets.",
  })
  @ApiParam({
    name: "eventId",
    description: "UUID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiParam({
    name: "tierId",
    description: "UUID of the ticket tier",
    example: "987fcdeb-51a2-4567-8901-123456789abc",
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Ticket tier deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "User is not authenticated",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "User does not have permission to delete this ticket tier",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Ticket tier not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Cannot delete ticket tier with sold tickets",
    schema: {
      example: {
        statusCode: 409,
        message: "Cannot delete ticket tier with sold tickets. Consider deactivating instead.",
        error: "Conflict",
      },
    },
  })
  async deleteTicketTier(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Request() req,
  ): Promise<void> {
    return this.ticketTierService.deleteTicketTier(tierId, req.user)
  }
}
