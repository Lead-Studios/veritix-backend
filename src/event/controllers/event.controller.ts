import { Controller, Post, Get, Body, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';
// import { AuthGuard } from '../../auth/auth.guard';
// import { RolesGuard } from '../../auth/roles.guard';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseGuards()
  create(@Body() dto: CreateEventDto) {
    return this.eventService.create(dto);
  }

  @Get()
  @UseGuards()
  findAll() {
    return this.eventService.findAll();
  }
} 