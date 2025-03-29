import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { EventsService } from "./events.service"
import type { CreateEventDto, UpdateEventDto } from "./dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { Role } from "../auth/enums/role.enum"

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "Get all events" })
  @ApiResponse({ status: 200, description: "List of events" })
  async getAllEvents() {
    try {
      return await this.eventsService.findAll()
    } catch (error) {
      throw new HttpException(error.message || "Failed to get events", error.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventById(@Param('id') id: string) {
    try {
      const event = await this.eventsService.findById(id);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      return event;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EVENT_ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async createEvent(@Body() createEventDto: CreateEventDto) {
    try {
      return await this.eventsService.create(createEventDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EVENT_ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event" })
  @ApiResponse({ status: 200, description: "Event updated successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async updateEvent(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    try {
      const event = await this.eventsService.update(id, updateEventDto)
      if (!event) {
        throw new HttpException("Event not found", HttpStatus.NOT_FOUND)
      }
      return event
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to update event",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EVENT_ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async deleteEvent(@Param('id') id: string) {
    try {
      const result = await this.eventsService.remove(id);
      if (!result) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/tickets')
  @ApiOperation({ summary: 'Get all tickets for an event' })
  @ApiResponse({ status: 200, description: 'List of tickets for the event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventTickets(@Param('id') id: string) {
    try {
      const event = await this.eventsService.findById(id);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.eventsService.getEventTickets(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get event tickets',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

