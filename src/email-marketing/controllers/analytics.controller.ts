import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('Email Analytics')
@Controller('email-marketing/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get email marketing dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getDashboardMetrics(dateRange);
  }

  @Get('campaigns/:id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get detailed campaign analytics' })
  @ApiResponse({ status: 200, description: 'Campaign analytics retrieved successfully' })
  async getCampaignAnalytics(@Param('id') campaignId: string) {
    return this.analyticsService.getCampaignAnalytics(campaignId);
  }

  @Get('automation/:id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get automation workflow analytics' })
  @ApiResponse({ status: 200, description: 'Automation analytics retrieved successfully' })
  async getAutomationAnalytics(@Param('id') workflowId: string) {
    return this.analyticsService.getAutomationAnalytics(workflowId);
  }

  @Get('segments/:id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get segment analytics' })
  @ApiResponse({ status: 200, description: 'Segment analytics retrieved successfully' })
  async getSegmentAnalytics(@Param('id') segmentId: string) {
    return this.analyticsService.getSegmentAnalytics(segmentId);
  }
}
