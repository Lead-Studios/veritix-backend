import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Your auth guard

@Controller('events')
// @UseGuards(JwtAuthGuard) // Protect with authentication
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':id/analytics')
  async getEventAnalytics(
    @Param('id') eventId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getEventAnalytics(eventId, query);
  }
}
