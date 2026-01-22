import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '../enums/event-status.enum';
import { User } from '../user/user.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // -------------------------------
  // GET ALL EVENTS
  // -------------------------------
  @Get()
  async getAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // For simplicity, we just return all events; you can add filters
    return this.eventsService.findAll();
  }

  // -------------------------------
  // GET EVENT BY ID
  // -------------------------------
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventById(id);
  }

  // -------------------------------
  // CREATE EVENT
  // -------------------------------
  @Post()
  async create(
    @Body() dto: CreateEventDto,
    @Body('user') user: User, // In real app, use @Req() + auth guard
  ) {
    return this.eventsService.createEvent(dto, user);
  }

  // -------------------------------
  // UPDATE EVENT
  // -------------------------------
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @Body('user') user: User, // replace with real user from AuthGuard
  ) {
    return this.eventsService.updateEvent(id, dto, user);
  }

  // -------------------------------
  // CHANGE STATUS
  // -------------------------------
  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EventStatus,
    @Body('user') user: User,
  ) {
    return this.eventsService.changeStatus(id, status, user);
  }

  // -------------------------------
  // DELETE EVENT
  // -------------------------------
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('user') user: User,
  ) {
    const success = await this.eventsService.deleteEvent(id, user);
    return { success };
  }
}
