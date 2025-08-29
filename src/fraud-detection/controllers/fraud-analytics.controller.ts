import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FraudAnalyticsService, FraudDashboardData, FraudPattern } from '../services/fraud-analytics.service';

@ApiTags('Fraud Analytics')
@Controller('fraud-analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FraudAnalyticsController {
  constructor(private fraudAnalyticsService: FraudAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get fraud detection dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(
    @Query('timeRange') timeRange: 'day' | 'week' | 'month' | 'quarter' = 'month',
  ): Promise<FraudDashboardData> {
    try {
      return await this.fraudAnalyticsService.getDashboardData(timeRange);
    } catch (error) {
      throw new HttpException(
        `Failed to get dashboard data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('patterns')
  @ApiOperation({ summary: 'Identify fraud patterns' })
  @ApiResponse({ status: 200, description: 'Fraud patterns identified' })
  async identifyFraudPatterns(
    @Query('minFrequency') minFrequency: number = 5,
  ): Promise<FraudPattern[]> {
    try {
      return await this.fraudAnalyticsService.identifyFraudPatterns(minFrequency);
    } catch (error) {
      throw new HttpException(
        `Failed to identify fraud patterns: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Get anomaly detection results' })
  @ApiResponse({ status: 200, description: 'Anomalies detected' })
  async getAnomalyDetection(
    @Query('timeRange') timeRange: 'hour' | 'day' | 'week' = 'day',
  ) {
    try {
      return await this.fraudAnalyticsService.getAnomalyDetection(timeRange);
    } catch (error) {
      throw new HttpException(
        `Failed to detect anomalies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-report')
  @ApiOperation({ summary: 'Generate fraud detection report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateFraudReport(
    @Body() reportRequest: {
      startDate: string;
      endDate: string;
      includeDetails?: boolean;
    },
  ) {
    try {
      const startDate = new Date(reportRequest.startDate);
      const endDate = new Date(reportRequest.endDate);
      const includeDetails = reportRequest.includeDetails || false;

      return await this.fraudAnalyticsService.generateFraudReport(
        startDate,
        endDate,
        includeDetails,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to generate report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Get fraud detection overview metrics' })
  @ApiResponse({ status: 200, description: 'Overview metrics retrieved' })
  async getOverviewMetrics(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.overview;
    } catch (error) {
      throw new HttpException(
        `Failed to get overview metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/trends')
  @ApiOperation({ summary: 'Get fraud detection trend metrics' })
  @ApiResponse({ status: 200, description: 'Trend metrics retrieved' })
  async getTrendMetrics(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.trends;
    } catch (error) {
      throw new HttpException(
        `Failed to get trend metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/risk-distribution')
  @ApiOperation({ summary: 'Get risk score distribution' })
  @ApiResponse({ status: 200, description: 'Risk distribution retrieved' })
  async getRiskDistribution(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.riskDistribution;
    } catch (error) {
      throw new HttpException(
        `Failed to get risk distribution: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/fraud-types')
  @ApiOperation({ summary: 'Get fraud type distribution' })
  @ApiResponse({ status: 200, description: 'Fraud type distribution retrieved' })
  async getFraudTypeDistribution(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.fraudTypes;
    } catch (error) {
      throw new HttpException(
        `Failed to get fraud type distribution: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/risk-factors')
  @ApiOperation({ summary: 'Get top risk factors' })
  @ApiResponse({ status: 200, description: 'Top risk factors retrieved' })
  async getTopRiskFactors(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.topRiskFactors;
    } catch (error) {
      throw new HttpException(
        `Failed to get top risk factors: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/geographic')
  @ApiOperation({ summary: 'Get geographic fraud distribution' })
  @ApiResponse({ status: 200, description: 'Geographic distribution retrieved' })
  async getGeographicDistribution(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.geographicDistribution;
    } catch (error) {
      throw new HttpException(
        `Failed to get geographic distribution: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/device-analytics')
  @ApiOperation({ summary: 'Get device analytics' })
  @ApiResponse({ status: 200, description: 'Device analytics retrieved' })
  async getDeviceAnalytics(@Query('timeRange') timeRange: string = 'month') {
    try {
      const dashboardData = await this.fraudAnalyticsService.getDashboardData(timeRange as any);
      return dashboardData.deviceAnalytics;
    } catch (error) {
      throw new HttpException(
        `Failed to get device analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
