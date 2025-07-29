import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AnalyticsEventService } from './analytics-event.service';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('analytics-event')
export class AnalyticsEventController {
  constructor(private readonly analyticsEventService: AnalyticsEventService) {}

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get event analytics data' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analytics range (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analytics range (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventAnalytics(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AnalyticsResponseDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsEventService.getEventAnalytics(eventId, start, end);
  }
}
