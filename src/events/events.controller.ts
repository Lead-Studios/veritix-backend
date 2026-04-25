import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { WaitlistService } from './waitlist.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventStatus } from './enums/event-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  async create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: User) {
    return await this.eventsService.createEvent(createEventDto, user);
  }

  @Get()
  async findAll(@Query() query: EventQueryDto) {
    return await this.eventsService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  async findMyEvents(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return await this.eventsService.findByOrganizer(user.id, pagination);
  }

  @Get(':id/capacity')
  async getCapacity(@Param('id') id: string) {
    return await this.eventsService.getCapacity(id);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return await this.eventsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: User) {
    return await this.eventsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async changeStatus(
    @Param('id') id: string,
    @Body('status') status: EventStatus,
    @CurrentUser() user: User,
  ) {
    return await this.eventsService.changeStatus(id, status, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.eventsService.remove(id, user);
    return { message: 'Event archived successfully' };
  }

  @Post(':id/waitlist')
  @UseGuards(JwtAuthGuard)
  async joinWaitlist(
    @Param('id') id: string,
    @Body('ticketTypeId') ticketTypeId: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.waitlistService.addToWaitlist(id, user.id, ticketTypeId);
  }

  @Delete(':id/waitlist')
  @UseGuards(JwtAuthGuard)
  async leaveWaitlist(@Param('id') id: string, @CurrentUser() user: User) {
    await this.waitlistService.removeFromWaitlist(id, user.id);
    return { message: 'Removed from waitlist' };
  }
}
