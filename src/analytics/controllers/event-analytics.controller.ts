import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EventAnalyticsService } from '../services/event-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EventAnalyticsResource } from '../resources/event-analytics.resource';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('analytics/events')
export class EventAnalyticsController {
  constructor(private readonly analyticsService: EventAnalyticsService) {}

  @Get(':eventId/revenue')
  @ApiOperation({ summary: 'Get total event revenue (optionally filtered)' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiQuery({ name: 'filter', required: false, enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  async getRevenue(@Param('eventId') eventId: string, @Query('filter') filter?: string) {
    const revenue = await this.analyticsService.getRevenue(eventId, filter);
    return EventAnalyticsResource.revenueResponse(revenue, filter);
  }

  @Get(':eventId/profit')
  @ApiOperation({ summary: 'Get total event profit (optionally filtered)' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiQuery({ name: 'filter', required: false, enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  async getProfit(@Param('eventId') eventId: string, @Query('filter') filter?: string) {
    const profit = await this.analyticsService.getProfit(eventId, filter);
    return EventAnalyticsResource.profitResponse(profit, filter);
  }
} 