import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { ResalePolicyDto } from './dto/resale-policy.dto';

@Controller('events')
@UseGuards(AuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('admin', 'event-manager')
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    // Optionally associate event with user: req.user.id
    return this.eventsService.create(createEventDto);
  }

  @Get()
  async findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.eventsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'event-manager')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.eventsService.remove(id);
    return;
  }

  @Put(':id/resale-policy')
  @Roles('admin', 'event-manager')
  async updateResalePolicy(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() resalePolicyDto: ResalePolicyDto,
  ) {
    return this.eventsService.updateResalePolicy(id, resalePolicyDto);
  }
}
