import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../../user/user.entity';

export interface AuthRequest extends ExpressRequest {
  user: User;
}

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthRequest,
  ) {
    // Organizer is the authenticated user
    return this.eventService.create(createEventDto, req.user);
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    return this.eventService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.eventService.findOne(id, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthRequest,
  ) {
    return this.eventService.update(id, updateEventDto, req.user);
  }
}
