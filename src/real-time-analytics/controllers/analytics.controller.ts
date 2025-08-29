import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RealTimeStreamingService } from '../services/real-time-streaming.service';
import { TicketSalesTrackingService } from '../services/ticket-sales-tracking.service';
import { DemographicsAnalysisService } from '../services/demographics-analysis.service';
import { SentimentMonitoringService } from '../services/sentiment-monitoring.service';
import { RevenueForecastingService } from '../services/revenue-forecasting.service';
import { ComparativeAnalysisService } from '../services/comparative-analysis.service';
import { PerformanceAlertsService } from '../services/performance-alerts.service';

@ApiTags('Real-Time Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly streamingService: RealTimeStreamingService,
    private readonly ticketSalesService: TicketSalesTrackingService,
    private readonly demographicsService: DemographicsAnalysisService,
    private readonly sentimentService: SentimentMonitoringService,
    private readonly forecastingService: RevenueForecastingService,
    private readonly comparativeService: ComparativeAnalysisService,
    private readonly alertsService: PerformanceAlertsService,
  ) {}

  // Event Analytics Overview
  @Get('events/:eventId/overview')
  @ApiOperation({ summary: 'Get comprehensive analytics overview for an event' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getEventAnalyticsOverview(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
  ) {
    try {
      const [
        ticketSales,
        demographics,
        sentiment,
        revenue,
        comparative,
        alerts,
      ] = await Promise.all([
        this.ticketSalesService.getTicketSalesMetrics(eventId),
        this.demographicsService.getDemographicsData(eventId),
        this.sentimentService.getSentimentAnalysis(eventId),
        this.forecastingService.generateRevenueProjection(eventId, organizerId),
        this.comparativeService.performComparativeAnalysis(eventId, organizerId),
        this.alertsService.getActiveAlertsForEvent(eventId),
      ]);

      return {
        eventId,
        organizerId,
        timestamp: new Date(),
        ticketSales,
        demographics,
        sentiment,
        revenue,
        comparative,
        alerts,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve analytics overview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Ticket Sales Analytics
  @Get('events/:eventId/ticket-sales')
  @ApiOperation({ summary: 'Get detailed ticket sales analytics' })
  async getTicketSalesAnalytics(@Param('eventId') eventId: string) {
    return await this.ticketSalesService.getTicketSalesMetrics(eventId);
  }

  @Post('events/:eventId/ticket-sales/track')
  @ApiOperation({ summary: 'Track new ticket sale' })
  async trackTicketSale(
    @Param('eventId') eventId: string,
    @Body() saleData: any,
  ) {
    return await this.ticketSalesService.trackTicketSale(eventId, saleData);
  }

  @Get('events/:eventId/ticket-sales/projections')
  @ApiOperation({ summary: 'Get ticket sales projections' })
  async getTicketSalesProjections(
    @Param('eventId') eventId: string,
    @Query('horizon') horizon: '24h' | '7d' | '30d' = '7d',
  ) {
    return await this.ticketSalesService.generateSalesProjections(eventId, horizon);
  }

  // Demographics Analytics
  @Get('events/:eventId/demographics')
  @ApiOperation({ summary: 'Get attendee demographics analysis' })
  async getDemographicsAnalysis(@Param('eventId') eventId: string) {
    return await this.demographicsService.getDemographicsData(eventId);
  }

  @Post('events/:eventId/demographics/analyze')
  @ApiOperation({ summary: 'Analyze attendee profile data' })
  async analyzeAttendeeProfile(
    @Param('eventId') eventId: string,
    @Body() profileData: any,
  ) {
    return await this.demographicsService.analyzeAttendeeProfile(eventId, profileData);
  }

  @Get('events/:eventId/demographics/insights')
  @ApiOperation({ summary: 'Get demographic insights and trends' })
  async getDemographicInsights(@Param('eventId') eventId: string) {
    return await this.demographicsService.generateInsights(eventId);
  }

  // Sentiment Analytics
  @Get('events/:eventId/sentiment')
  @ApiOperation({ summary: 'Get social media sentiment analysis' })
  async getSentimentAnalysis(@Param('eventId') eventId: string) {
    return await this.sentimentService.getSentimentAnalysis(eventId);
  }

  @Post('events/:eventId/sentiment/monitor')
  @ApiOperation({ summary: 'Start sentiment monitoring for event' })
  async startSentimentMonitoring(
    @Param('eventId') eventId: string,
    @Body() config: { platforms: string[]; keywords: string[] },
  ) {
    return await this.sentimentService.startMonitoring(eventId, config.platforms, config.keywords);
  }

  @Delete('events/:eventId/sentiment/monitor')
  @ApiOperation({ summary: 'Stop sentiment monitoring for event' })
  async stopSentimentMonitoring(@Param('eventId') eventId: string) {
    return await this.sentimentService.stopMonitoring(eventId);
  }

  @Get('events/:eventId/sentiment/alerts')
  @ApiOperation({ summary: 'Get sentiment-based alerts' })
  async getSentimentAlerts(@Param('eventId') eventId: string) {
    return await this.sentimentService.getSentimentAlerts(eventId);
  }

  // Revenue Forecasting
  @Get('events/:eventId/revenue/forecast')
  @ApiOperation({ summary: 'Get revenue forecasting analysis' })
  async getRevenueForecast(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
    @Query('horizon') horizon: '24h' | '7d' | '30d' | 'event_end' = '7d',
  ) {
    return await this.forecastingService.generateRevenueProjection(eventId, organizerId, horizon);
  }

  @Post('events/:eventId/revenue/forecast/refresh')
  @ApiOperation({ summary: 'Refresh revenue forecasting models' })
  async refreshRevenueForecast(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
  ) {
    return await this.forecastingService.generateRevenueProjection(eventId, organizerId);
  }

  // Comparative Analysis
  @Get('events/:eventId/comparative')
  @ApiOperation({ summary: 'Get comparative performance analysis' })
  async getComparativeAnalysis(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
  ) {
    return await this.comparativeService.performComparativeAnalysis(eventId, organizerId);
  }

  // Performance Alerts
  @Get('events/:eventId/alerts')
  @ApiOperation({ summary: 'Get active performance alerts' })
  async getPerformanceAlerts(@Param('eventId') eventId: string) {
    return await this.alertsService.getActiveAlertsForEvent(eventId);
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a performance alert' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() body: { userId: string },
  ) {
    await this.alertsService.acknowledgeAlert(alertId, body.userId);
    return { success: true, message: 'Alert acknowledged' };
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve a performance alert' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { userId: string },
  ) {
    await this.alertsService.resolveAlert(alertId, body.userId);
    return { success: true, message: 'Alert resolved' };
  }

  @Post('alert-rules')
  @ApiOperation({ summary: 'Create custom alert rule' })
  async createAlertRule(@Body() rule: any) {
    const ruleId = await this.alertsService.addCustomAlertRule(rule);
    return { ruleId, message: 'Alert rule created successfully' };
  }

  @Put('alert-rules/:ruleId')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: any,
  ) {
    await this.alertsService.updateAlertRule(ruleId, updates);
    return { success: true, message: 'Alert rule updated' };
  }

  @Delete('alert-rules/:ruleId')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('ruleId') ruleId: string) {
    await this.alertsService.deleteAlertRule(ruleId);
    return { success: true, message: 'Alert rule deleted' };
  }

  // Real-time Data Streaming
  @Post('events/:eventId/stream/data')
  @ApiOperation({ summary: 'Ingest real-time analytics data' })
  async ingestAnalyticsData(
    @Param('eventId') eventId: string,
    @Body() dataPoints: any[],
  ) {
    await this.streamingService.ingestDataPoints(eventId, dataPoints);
    return { success: true, message: 'Data ingested successfully' };
  }

  @Get('events/:eventId/stream/status')
  @ApiOperation({ summary: 'Get streaming status for event' })
  async getStreamingStatus(@Param('eventId') eventId: string) {
    return {
      eventId,
      isStreaming: true, // This would be determined by the streaming service
      lastUpdate: new Date(),
      dataPointsProcessed: 0, // This would come from the streaming service
    };
  }

  // Analytics Export
  @Get('events/:eventId/export')
  @ApiOperation({ summary: 'Export analytics data' })
  async exportAnalyticsData(
    @Param('eventId') eventId: string,
    @Query('format') format: 'json' | 'csv' | 'xlsx' = 'json',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    // This would implement data export functionality
    return {
      message: 'Export functionality to be implemented',
      format,
      dateRange: { from: dateFrom, to: dateTo },
    };
  }

  // Analytics Configuration
  @Get('events/:eventId/config')
  @ApiOperation({ summary: 'Get analytics configuration' })
  async getAnalyticsConfig(@Param('eventId') eventId: string) {
    return {
      eventId,
      streamingEnabled: true,
      alertsEnabled: true,
      sentimentMonitoring: true,
      updateFrequency: '5m',
      retentionPeriod: '90d',
    };
  }

  @Put('events/:eventId/config')
  @ApiOperation({ summary: 'Update analytics configuration' })
  async updateAnalyticsConfig(
    @Param('eventId') eventId: string,
    @Body() config: any,
  ) {
    // This would update analytics configuration
    return {
      success: true,
      message: 'Configuration updated successfully',
      config,
    };
  }
}
