import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

import { RolesGuard } from "security/guards/rolesGuard/roles.guard";

import { UserRole } from "../common/enums/users-roles.enum";
import { Event } from "./entities/event.entity";
import { EventStatus } from "../common/enums/event-status.enum";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RoleDecorator } from "security/decorators/roles.decorator";

@ApiTags("Events")
@ApiBearerAuth()
@Controller("events")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @UseInterceptors(FileInterceptor("coverImage"))
  @ApiOperation({
    summary: "Create new event",
    description: "Create a new event with all its details",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Event creation payload with optional cover image",
    type: CreateEventDto,
  })
  @ApiResponse({
    status: 201,
    description: "Event created successfully",
    type: Event,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.eventsService.create(createEventDto, coverImage);
  }

  @Get()
  @ApiOperation({
    summary: "Get all events",
    description: "Retrieve all events with optional filtering and pagination",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number for pagination",
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of items per page",
    type: Number,
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term for event title or description",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter by event category",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Filter events starting from this date",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "Filter events until this date",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by event status",
  })
  @ApiResponse({
    status: 200,
    description: "List of events with pagination metadata",
    type: [Event],
  })
  findAll(@Req() req: any) {
    const filters = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
      status: req.query.status as EventStatus,
    };
    return this.eventsService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get event by ID",
    description: "Retrieve detailed information about a specific event",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Event details retrieved successfully",
    type: Event,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  findOne(@Param("id") id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(":id")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @UseInterceptors(FileInterceptor("coverImage"))
  @ApiOperation({
    summary: "Update event",
    description: "Update an existing event's details",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Event update payload with optional cover image",
    type: UpdateEventDto,
  })
  @ApiResponse({
    status: 200,
    description: "Event updated successfully",
    type: Event,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.eventsService.update(id, updateEventDto, coverImage);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Delete event",
    description: "Delete an event and all associated data",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({ status: 200, description: "Event deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  remove(@Param("id") id: string) {
    return this.eventsService.remove(id);
  }

  @Post(":id/publish")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Publish event",
    description: "Make an event visible to the public",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Event published successfully",
    type: Event,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  publish(@Param("id") id: string) {
    return this.eventsService.publish(id);
  }

  @Post(":id/unpublish")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Unpublish event",
    description: "Hide an event from the public",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Event unpublished successfully",
    type: Event,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  unpublish(@Param("id") id: string) {
    return this.eventsService.unpublish(id);
  }

  @Post(":id/cancel")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Cancel event",
    description: "Cancel an event and handle all associated operations",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    description: "Cancellation details",
    schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for cancellation",
          example: "Weather conditions",
        },
        refundPolicy: {
          type: "string",
          description: "Policy for handling refunds",
          example: "Full refund within 30 days",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Event cancelled successfully",
    type: Event,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  cancel(
    @Param("id") id: string,
    @Body() cancellationDetails: { reason: string; refundPolicy: string },
  ) {
    return this.eventsService.cancel(id, cancellationDetails);
  }

  @Post(":id/postpone")
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  @ApiOperation({
    summary: "Postpone event",
    description: "Change the date of an event and handle notifications",
  })
  @ApiParam({
    name: "id",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    description: "Postponement details",
    schema: {
      type: "object",
      properties: {
        newStartDate: {
          type: "string",
          format: "date-time",
          description: "New start date and time",
          example: "2025-05-30T18:00:00Z",
        },
        newEndDate: {
          type: "string",
          format: "date-time",
          description: "New end date and time",
          example: "2025-05-30T23:00:00Z",
        },
        reason: {
          type: "string",
          description: "Reason for postponement",
          example: "Venue maintenance",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Event postponed successfully",
    type: Event,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  postpone(
    @Param("id") id: string,
    @Body()
    postponementDetails: {
      newStartDate: Date;
      newEndDate: Date;
      reason: string;
    },
  ) {
    return this.eventsService.postpone(id, postponementDetails);
  }
}
