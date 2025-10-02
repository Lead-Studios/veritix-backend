import { Controller, Post, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventAntiScalpingDto } from '../../ticket/dto/update-event-anti-scalping.dto';
import { User } from '../../user/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('events')
@ApiTags('Events')
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

  @Patch(':id/anti-scalping')
  @ApiOperation({ summary: 'Update anti-scalping settings for an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Anti-scalping settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Only event organizers can update settings' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateAntiScalpingSettings(
    @Param('id') id: string,
    @Body() antiScalpingDto: UpdateEventAntiScalpingDto,
    @Request() req: any,
  ) {
    return this.eventService.updateAntiScalpingSettings(id, antiScalpingDto, req.user as User);
  }
}
