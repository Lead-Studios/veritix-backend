import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EventService } from '../services/event.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ArchiveEventDto } from '../dtos/archive-event.dto';
import { DeleteEventDto } from '../dtos/delete-event.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('retrieve/all-event')
  @ApiOperation({ summary: 'Retrieve all events' })
  findAll() {
    return this.eventService.findAll();
  }

  @Get('retrieve/event/:id')
  @ApiOperation({ summary: 'Retrieve single event' })
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Post('archive/event')
  @ApiOperation({ summary: 'Archive event' })
  @ApiBody({ type: ArchiveEventDto })
  archive(@Body() dto: ArchiveEventDto) {
    return this.eventService.archive(dto);
  }

  @Delete('delete/event')
  @ApiOperation({ summary: 'Delete event' })
  @ApiBody({ type: DeleteEventDto })
  delete(@Body() dto: DeleteEventDto) {
    return this.eventService.delete(dto);
  }
}
