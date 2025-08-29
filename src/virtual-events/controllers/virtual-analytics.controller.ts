import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VirtualAnalyticsService } from '../services/virtual-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Virtual Event Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events/:eventId/analytics')
export class VirtualAnalyticsController {
  constructor(private readonly virtualAnalyticsService: VirtualAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive event analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getEventAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getEventAnalytics(eventId);
  }

  @Get('attendees')
  @ApiOperation({ summary: 'Get attendee analytics' })
  @ApiResponse({ status: 200, description: 'Attendee analytics retrieved successfully' })
  async getAttendeeAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getAttendeeAnalytics(eventId);
  }

  @Get('interactions')
  @ApiOperation({ summary: 'Get interaction analytics' })
  @ApiResponse({ status: 200, description: 'Interaction analytics retrieved successfully' })
  async getInteractionAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getInteractionAnalytics(eventId);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement analytics' })
  @ApiResponse({ status: 200, description: 'Engagement analytics retrieved successfully' })
  async getEngagementAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getEngagementAnalytics(eventId);
  }

  @Get('recordings')
  @ApiOperation({ summary: 'Get recording analytics' })
  @ApiResponse({ status: 200, description: 'Recording analytics retrieved successfully' })
  async getRecordingAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getRecordingAnalytics(eventId);
  }

  @Get('breakout-rooms')
  @ApiOperation({ summary: 'Get breakout room analytics' })
  @ApiResponse({ status: 200, description: 'Breakout room analytics retrieved successfully' })
  async getBreakoutRoomAnalytics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getBreakoutRoomAnalytics(eventId);
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics retrieved successfully' })
  async getRealtimeMetrics(@Param('eventId') eventId: string) {
    return this.virtualAnalyticsService.getRealtimeMetrics(eventId);
  }
}
