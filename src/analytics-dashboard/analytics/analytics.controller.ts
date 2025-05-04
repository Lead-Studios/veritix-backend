import { Controller, Get, Query, UseGuards, Res, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Return dashboard analytics data' })
  async getDashboardAnalytics(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getDashboardAnalytics(filters);
  }

  @Get('attendance/daily')
  @ApiOperation({ summary: 'Get daily attendance analytics' })
  @ApiResponse({ status: 200, description: 'Return daily attendance data' })
  async getDailyAttendance(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getDailyAttendance(filters);
  }

  @Get('attendance/sessions')
  @ApiOperation({ summary: 'Get session attendance analytics' })
  @ApiResponse({ status: 200, description: 'Return session attendance data' })
  async getSessionAttendance(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getSessionAttendance(filters);
  }

  @Get('sessions/popular')
  @ApiOperation({ summary: 'Get most and least popular sessions' })
  @ApiResponse({ status: 200, description: 'Return popular session data' })
  async getPopularSessions(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getPopularSessions(filters);
  }

  @Get('feedback/average')
  @ApiOperation({ summary: 'Get average feedback scores' })
  @ApiResponse({ status: 200, description: 'Return average feedback data' })
  async getAverageFeedback(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getAverageFeedback(filters);
  }

  @Get('speakers/punctuality')
  @ApiOperation({ summary: 'Get speaker punctuality data' })
  @ApiResponse({ status: 200, description: 'Return speaker punctuality data' })
  async getSpeakerPunctuality(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getSpeakerPunctuality(filters);
  }

  @Get('sessions/overlap')
  @ApiOperation({ summary: 'Get session overlap statistics' })
  @ApiResponse({ status: 200, description: 'Return session overlap data' })
  async getSessionOverlap(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getSessionOverlap(filters);
  }

  @Post('export/csv')
  @ApiOperation({ summary: 'Export analytics data as CSV' })
  async exportCsv(@Body() filters: AnalyticsFiltersDto, @Res() res: Response) {
    const csvData = await this.analyticsService.exportAnalyticsData(filters, 'csv');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=conference-analytics.csv');
    return res.send(csvData);
  }

  @Post('export/pdf')
  @ApiOperation({ summary: 'Export analytics data as PDF' })
  async exportPdf(@Body() filters: AnalyticsFiltersDto, @Res() res: Response) {
    const pdfBuffer = await this.analyticsService.exportAnalyticsData(filters, 'pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=conference-analytics.pdf');
    return res.send(pdfBuffer);
  }
}