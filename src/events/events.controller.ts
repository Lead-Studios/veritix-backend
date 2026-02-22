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
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '../enums/event-status.enum';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { CurrentUser } from 'src/auth/decorators/current.user.decorators';
import { RolesGuard } from 'src/auth/guard/roles.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // -------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------

  @Get()
  async getAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findAll({ page, limit });
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventById(id);
  }

  // -------------------------------
  // PROTECTED ENDPOINTS
  // -------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.createEvent(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.updateEvent(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EventStatus,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.changeStatus(id, status, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.eventsService.deleteEvent(id, user);
    return { message: 'Event deleted successfully' };
  }
}