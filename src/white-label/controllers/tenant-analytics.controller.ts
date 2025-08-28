import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantAnalyticsService, CreateAnalyticsDto, AnalyticsQuery } from '../services/tenant-analytics.service';
import { TenantAnalytics, MetricType } from '../entities/tenant-analytics.entity';

@ApiTags('White Label - Analytics')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/analytics')
export class TenantAnalyticsController {
  constructor(private readonly analyticsService: TenantAnalyticsService) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Record analytics metric' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Metric recorded successfully', type: TenantAnalytics })
  async recordMetric(
    @Param('tenantId') tenantId: string,
    @Body() createAnalyticsDto: CreateAnalyticsDto,
  ): Promise<TenantAnalytics> {
    return this.analyticsService.recordMetric(tenantId, createAnalyticsDto);
  }

  @Post('metrics/bulk')
  @ApiOperation({ summary: 'Record multiple analytics metrics' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Metrics recorded successfully', type: [TenantAnalytics] })
  async recordBulkMetrics(
    @Param('tenantId') tenantId: string,
    @Body() metrics: CreateAnalyticsDto[],
  ): Promise<TenantAnalytics[]> {
    return this.analyticsService.recordBulkMetrics(tenantId, metrics);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get analytics metrics with filters' })
  @ApiQuery({ name: 'metricNames', required: false, type: [String] })
  @ApiQuery({ name: 'metricTypes', required: false, enum: MetricType, isArray: true })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved', type: [TenantAnalytics] })
  async getMetrics(
    @Param('tenantId') tenantId: string,
    @Query('metricNames') metricNames?: string[],
    @Query('metricTypes') metricTypes?: MetricType[],
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TenantAnalytics[]> {
    const query: AnalyticsQuery = {
      metricNames,
      metricTypes,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getMetrics(tenantId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics overview' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard metrics retrieved' })
  async getDashboard(@Param('tenantId') tenantId: string): Promise<any> {
    return this.analyticsService.getDashboardMetrics(tenantId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage metrics retrieved' })
  async getUsageMetrics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getUsageMetrics(tenantId, start, end);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getPerformanceMetrics(tenantId, start, end);
  }

  @Get('billing')
  @ApiOperation({ summary: 'Get billing metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, description: 'Billing metrics retrieved' })
  async getBillingMetrics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getBillingMetrics(tenantId, start, end);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature usage metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature usage metrics retrieved' })
  async getFeatureUsageMetrics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getFeatureUsageMetrics(tenantId, start, end);
  }

  @Post('usage/:metricName')
  @ApiOperation({ summary: 'Record usage metric' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Usage metric recorded' })
  async recordUsageMetric(
    @Param('tenantId') tenantId: string,
    @Param('metricName') metricName: string,
    @Body('value') value: number,
    @Body('dimensions') dimensions?: Record<string, any>,
  ): Promise<void> {
    return this.analyticsService.recordUsageMetric(tenantId, metricName, value, dimensions);
  }

  @Post('performance/:metricName')
  @ApiOperation({ summary: 'Record performance metric' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Performance metric recorded' })
  async recordPerformanceMetric(
    @Param('tenantId') tenantId: string,
    @Param('metricName') metricName: string,
    @Body('value') value: number,
    @Body('unit') unit?: string,
  ): Promise<void> {
    return this.analyticsService.recordPerformanceMetric(tenantId, metricName, value, unit);
  }

  @Post('billing/:metricName')
  @ApiOperation({ summary: 'Record billing metric' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Billing metric recorded' })
  async recordBillingMetric(
    @Param('tenantId') tenantId: string,
    @Param('metricName') metricName: string,
    @Body('value') value: number,
    @Body('metadata') metadata?: Record<string, any>,
  ): Promise<void> {
    return this.analyticsService.recordBillingMetric(tenantId, metricName, value, metadata);
  }

  @Post('features/:featureName/usage')
  @ApiOperation({ summary: 'Record feature usage' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Feature usage recorded' })
  async recordFeatureUsage(
    @Param('tenantId') tenantId: string,
    @Param('featureName') featureName: string,
    @Body('userId') userId?: string,
  ): Promise<void> {
    return this.analyticsService.recordFeatureUsage(tenantId, featureName, userId);
  }
}
