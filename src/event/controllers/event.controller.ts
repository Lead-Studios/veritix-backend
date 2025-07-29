import { Controller, Post, Get, Body, UsePipes, ValidationPipe, UseGuards, Query } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Retrieve all events with pagination' })
  @ApiResponse({ status: 200, description: 'All events retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAllEvents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.eventService.findAll({ page, limit });
  }

  @Get('by-name')
  @ApiOperation({ summary: 'Filter events by name with pagination' })
  @ApiResponse({ status: 200, description: 'Events filtered by name' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getEventsByName(
    @Query('name') name: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.eventService.findAll({ name, page, limit });
  }

  @Get('by-location')
  @ApiOperation({ summary: 'Filter events by location with pagination' })
  @ApiResponse({ status: 200, description: 'Events filtered by location' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiQuery({ name: 'location', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getEventsByLocation(
    @Query('location') location: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.eventService.findAll({ location, page, limit });
  }

  @Get('by-name-and-location')
  @ApiOperation({ summary: 'Filter events by both name and location with pagination' })
  @ApiResponse({ status: 200, description: 'Events filtered by name and location' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiQuery({ name: 'location', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getEventsByNameAndLocation(
    @Query('name') name: string,
    @Query('location') location: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.eventService.findAll({ name, location, page, limit });
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
