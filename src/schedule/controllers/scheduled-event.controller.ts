import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { ScheduledEventService } from "../services/scheduled-event.service"
import { CreateScheduledEventDto, UpdateScheduledEventDto, ScheduledEventDto } from "../dto/scheduled-event.dto"

@ApiTags("Scheduled Events")
@Controller("scheduled-events")
export class ScheduledEventController {
  constructor(private readonly scheduledEventService: ScheduledEventService) {}

  @Post()
  @ApiOperation({ summary: "Schedule an event for future publication" })
  @ApiResponse({
    status: 201,
    description: "Event scheduled successfully",
    type: ScheduledEventDto,
  })
  @ApiBody({ type: CreateScheduledEventDto })
  async create(@Body() createDto: CreateScheduledEventDto): Promise<ScheduledEventDto> {
    // In a real application, you would get the user ID from the authentication context
    const userId = "organizer-user-id-123" // Replace with actual user ID from auth
    return this.scheduledEventService.create(createDto, userId)
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a scheduled event's publication time" })
  @ApiResponse({
    status: 200,
    description: "Scheduled event updated successfully",
    type: ScheduledEventDto,
  })
  @ApiResponse({ status: 404, description: "Scheduled event not found" })
  @ApiResponse({ status: 400, description: "Invalid update data or event status" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the scheduled event" })
  @ApiBody({ type: UpdateScheduledEventDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateScheduledEventDto,
  ): Promise<ScheduledEventDto> {
    return this.scheduledEventService.update(id, updateDto)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancel a scheduled event" })
  @ApiResponse({ status: 204, description: "Scheduled event cancelled successfully" })
  @ApiResponse({ status: 404, description: "Scheduled event not found" })
  @ApiResponse({ status: 400, description: "Cannot cancel an event that is not pending" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the scheduled event to cancel" })
  async cancel(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.scheduledEventService.cancel(id)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a scheduled event by ID" })
  @ApiResponse({
    status: 200,
    description: "Scheduled event retrieved successfully",
    type: ScheduledEventDto,
  })
  @ApiResponse({ status: 404, description: "Scheduled event not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the scheduled event" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ScheduledEventDto> {
    return this.scheduledEventService.findOne(id)
  }

  @Get()
  @ApiOperation({ summary: "Get all scheduled events (optional filter by event ID)" })
  @ApiResponse({
    status: 200,
    description: "List of scheduled events retrieved successfully",
    type: [ScheduledEventDto],
  })
  @ApiQuery({
    name: "eventId",
    type: "string",
    required: false,
    description: "Filter scheduled events by event ID",
  })
  async findAll(@Query("eventId") eventId?: string): Promise<ScheduledEventDto[]> {
    return this.scheduledEventService.findAll(eventId)
  }
}
