import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";

@Controller("events")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async createEvent(@Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(dto);
  }

  @Get()
  async getAllEvents() {
    return this.eventsService.getAllEvents();
  }

  @Get(":id")
  async getEventById(@Param("id") id: string) {
    return this.eventsService.getEventById(id);
  }

  @Put(":id")
  async updateEvent(
    @Param("id") id: string,
    @Body() dto: Partial<CreateEventDto>,
  ) {
    return this.eventsService.updateEvent(id, dto);
  }

  @Delete(":id")
  async deleteEvent(@Param("id") id: string) {
    return this.eventsService.deleteEvent(id);
  }

  @Get(":eventId/tickets")
  async getTicketsForEvent(@Param("eventId") eventId: string) {
    return this.eventsService.getTicketsForEvent(eventId);
  }

  @Get(":eventId/special-guests")
  async getSpecialGuestsForEvent(@Param("eventId") eventId: string) {
    return this.eventsService.getSpecialGuestsForEvent(eventId);
  }
}
