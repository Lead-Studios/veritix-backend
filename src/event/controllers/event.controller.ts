import { Controller, Post, Get, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateEventDto) {
    return this.eventService.create(dto);
  }

  @Get()
  findAll() {
    return this.eventService.findAll();
  }
} 