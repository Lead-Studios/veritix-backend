import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnnouncementService } from '../services/announcement.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only event organizers can create announcements' })
  async create(@Body() dto: CreateAnnouncementDto, @Request() req) {
    return this.announcementService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only event organizers can update announcements' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @Request() req) {
    return this.announcementService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only event organizers can delete announcements' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.announcementService.delete(id, req.user.id);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get announcements for a specific event' })
  @ApiResponse({ status: 200, description: 'Announcements retrieved successfully' })
  async getEventAnnouncements(@Param('eventId') eventId: string, @Request() req) {
    return this.announcementService.findEventAnnouncements(eventId, req.user.id);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get announcements for events where user has tickets' })
  @ApiResponse({ status: 200, description: 'User announcements retrieved successfully' })
  async getUserAnnouncements(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Request() req,
  ) {
    return this.announcementService.findUserAnnouncements(req.user.id, page, limit);
  }

  @Post(':id/broadcast')
  @ApiOperation({ summary: 'Manually broadcast an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement broadcasted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only event organizers can broadcast announcements' })
  async broadcast(@Param('id') id: string, @Request() req) {
    return this.announcementService.broadcastAnnouncement(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get delivery statistics for an announcement' })
  @ApiResponse({ status: 200, description: 'Delivery stats retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only event organizers can view delivery stats' })
  async getDeliveryStats(@Param('id') id: string, @Request() req) {
    return this.announcementService.getDeliveryStats(id, req.user.id);
  }
} 