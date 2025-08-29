import {
  Controller,
  Get,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiUsageService } from '../services/api-usage.service';
import { RequireApiPermissions } from '../decorators/api-decorators';
import { ApiPermission } from '../entities/api-key.entity';

@ApiTags('API Platform - Analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly apiUsageService: ApiUsageService) {}

  @Get('usage')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get API usage analytics' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['hour', 'day', 'week', 'month'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage analytics retrieved' })
  async getUsageAnalytics(
    @Query('tenantId') tenantId?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('days') days?: number,
    @Query('groupBy') groupBy?: 'hour' | 'day' | 'week' | 'month',
  ): Promise<any> {
    return this.apiUsageService.getAnalytics({
      tenantId,
      apiKeyId,
      days: days ? parseInt(days.toString()) : 30,
      groupBy: groupBy || 'day',
    });
  }

  @Get('errors')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get API error analytics' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Error analytics retrieved' })
  async getErrorAnalytics(
    @Query('tenantId') tenantId?: string,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.apiUsageService.getErrorAnalytics(
      tenantId,
      days ? parseInt(days.toString()) : 7,
    );
  }

  @Get('performance')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get API performance metrics' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'endpoint', required: false })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Query('tenantId') tenantId?: string,
    @Query('endpoint') endpoint?: string,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.apiUsageService.getPerformanceMetrics(
      tenantId,
      endpoint,
      days ? parseInt(days.toString()) : 7,
    );
  }

  @Get('top-endpoints')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get top API endpoints by usage' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Top endpoints retrieved' })
  async getTopEndpoints(
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: number,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.apiUsageService.getTopEndpoints(
      tenantId,
      limit ? parseInt(limit.toString()) : 10,
      days ? parseInt(days.toString()) : 30,
    );
  }

  @Get('dashboard')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved' })
  async getDashboard(@Query('tenantId') tenantId?: string): Promise<any> {
    const [usage, errors, performance, topEndpoints] = await Promise.all([
      this.apiUsageService.getAnalytics({ tenantId, days: 30, groupBy: 'day' }),
      this.apiUsageService.getErrorAnalytics(tenantId, 7),
      this.apiUsageService.getPerformanceMetrics(tenantId, undefined, 7),
      this.apiUsageService.getTopEndpoints(tenantId, 5, 30),
    ]);

    return {
      usage,
      errors,
      performance,
      topEndpoints,
      generatedAt: new Date(),
    };
  }
}
