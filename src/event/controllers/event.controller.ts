import { Controller, Post, Get, Body, UsePipes, ValidationPipe, UseGuards, Query, Req } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';
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

  @Get('search')
  @ApiOperation({ summary: 'Search events by name, category, and location with fuzzy matching' })
  @ApiQuery({ name: 'query', required: false, description: 'Event name or keyword' })
  @ApiQuery({ name: 'category', required: false, description: 'Event category' })
  @ApiQuery({ name: 'location', required: false, description: 'Location in format Country,State,City' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page', type: Number })
  async searchEvents(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.eventService.searchEvents({ query, category, location, page, limit });
  }
} 