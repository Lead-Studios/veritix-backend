import { Controller, Post, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { User } from '../../user/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(@Body() createEventDto: CreateEventDto, @Request() req: any) {
    // Organizer is the authenticated user
    return this.eventService.create(createEventDto, req.user as User);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.eventService.findAll(req.user as User);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.eventService.findOne(id, req.user as User);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @Request() req: any) {
    return this.eventService.update(id, updateEventDto, req.user as User);
  }
}
