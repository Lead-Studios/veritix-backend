import { Controller, Post, Get, Patch, Delete, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { ReminderService } from "../services/reminder.service"
import { type CreateReminderDto, type UpdateReminderDto, ReminderDto } from "../dto/reminder.dto"

@ApiTags("Reminders")
@Controller("reminders")
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @ApiOperation({ summary: "Create a new custom reminder for an event" })
  @ApiResponse({
    status: 201,
    description: "Reminder created and scheduled successfully",
    type: ReminderDto,
  })
  @ApiResponse({ status: 400, description: "Invalid data or event not found" })
  async create(createDto: CreateReminderDto): Promise<ReminderDto> {
    // In a real application, you would get the organizer ID from the authentication context
    const organizerId = "organizer-user-id-123" // Replace with actual organizer ID from auth
    return this.reminderService.createReminder(createDto, organizerId)
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an existing reminder" })
  @ApiResponse({
    status: 200,
    description: "Reminder updated successfully",
    type: ReminderDto,
  })
  @ApiResponse({ status: 404, description: "Reminder not found" })
  @ApiResponse({ status: 400, description: "Cannot update a triggered/failed reminder" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the reminder to update" })
  async update(@Param("id", ParseUUIDPipe) id: string, updateDto: UpdateReminderDto): Promise<ReminderDto> {
    return this.reminderService.updateReminder(id, updateDto)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a reminder" })
  @ApiResponse({ status: 204, description: "Reminder deleted successfully" })
  @ApiResponse({ status: 404, description: "Reminder not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the reminder to delete" })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.reminderService.deleteReminder(id)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a reminder by ID" })
  @ApiResponse({
    status: 200,
    description: "Reminder retrieved successfully",
    type: ReminderDto,
  })
  @ApiResponse({ status: 404, description: "Reminder not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the reminder" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ReminderDto> {
    return this.reminderService.findOne(id)
  }

  @Get()
  @ApiOperation({ summary: "Get all reminders (optional filters by event ID or organizer ID)" })
  @ApiResponse({
    status: 200,
    description: "List of reminders retrieved successfully",
    type: [ReminderDto],
  })
  @ApiQuery({
    name: "eventId",
    type: "string",
    required: false,
    description: "Filter reminders by event ID",
  })
  @ApiQuery({
    name: "organizerId",
    type: "string",
    required: false,
    description: "Filter reminders by organizer ID",
  })
  async findAll(
    @Query("eventId") eventId?: string,
    @Query("organizerId") organizerId?: string,
  ): Promise<ReminderDto[]> {
    return this.reminderService.findAll(eventId, organizerId)
  }
}
