import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
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
  async getAllEvents(
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 10,
    @Query("name") name?: string,
    @Query("category") category?: string,
    @Query("location") location?: string,
  ) {
    return this.eventsService.getAllEvents(page, limit, { name, category, location });
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

  @Get('search')
  async searchEvents(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    if (!query) {
      throw new Error('Query parameter is required');
    }

    return this.eventsService.searchEvents(query, category, location, +page, +limit);
  }
}
