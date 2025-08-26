import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { PricingOptimizationService } from '../services/pricing-optimization.service';
import { ABTestingService } from '../services/ab-testing.service';
import { CreateABTestDto } from '../dto/create-ab-test.dto';

@ApiTags('Revenue Optimization Dashboard')
@Controller('revenue-optimization')
@ApiBearerAuth()
export class RevenueOptimizationController {
  constructor(
    private pricingOptimizationService: PricingOptimizationService,
    private abTestingService: ABTestingService,
    @InjectQueue('pricing-calculation')
    private pricingQueue: Queue,
  ) {}

  @Get('dashboard/:eventId')
  @ApiOperation({ summary: 'Get comprehensive revenue optimization dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getRevenueDashboard(@Param('eventId') eventId: string) {
    try {
      // Get revenue optimization report
      const revenueReport = await this.pricingOptimizationService.generateRevenueOptimizationReport(eventId);
      
      // Get revenue impact analysis
      const revenueImpact = await this.pricingOptimizationService.getRevenueImpactAnalysis(eventId, 30);
      
      // Get pending recommendations
      const pendingRecommendations = await this.pricingOptimizationService.getPendingRecommendations(eventId);
      
      // Get active A/B tests
      const activeABTests = await this.abTestingService.getActiveABTests(eventId);
      
      const dashboardData = {
        eventId,
        revenueOptimization: revenueReport,
        revenueImpact,
        pendingRecommendations: {
          count: pendingRecommendations.length,
          totalPotentialIncrease: pendingRecommendations.reduce(
            (sum, rec) => sum + parseFloat(rec.expectedRevenueIncrease.toString()),
            0
          ),
          recommendations: pendingRecommendations.slice(0, 5), // Top 5 recommendations
        },
        abTesting: {
          activeTests: activeABTests.length,
          tests: activeABTests,
        },
        summary: {
          currentRevenue: revenueReport.currentRevenue,
          projectedRevenue: revenueReport.projectedRevenue,
          potentialIncrease: revenueReport.revenueIncrease,
          potentialIncreasePercentage: revenueReport.revenueIncreasePercentage,
          recommendationsApplied: revenueImpact.appliedRecommendations,
          successRate: revenueImpact.successRate,
        },
      };

      return {
        success: true,
        data: dashboardData,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Error generating revenue dashboard: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get revenue optimization analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getAnalyticsOverview(
    @Query('eventIds') eventIds?: string,
    @Query('days') days: number = 30,
  ) {
    try {
      const eventIdList = eventIds ? eventIds.split(',') : [];
      
      let totalRevenueIncrease = 0;
      let totalAppliedRecommendations = 0;
      let totalSuccessRate = 0;
      let eventCount = 0;

      // If specific events provided, analyze those; otherwise get sample data
      const eventsToAnalyze = eventIdList.length > 0 ? eventIdList : ['sample-event-1', 'sample-event-2'];

      for (const eventId of eventsToAnalyze) {
        try {
          const impact = await this.pricingOptimizationService.getRevenueImpactAnalysis(eventId, days);
          totalRevenueIncrease += impact.totalRevenueImpact;
          totalAppliedRecommendations += impact.appliedRecommendations;
          totalSuccessRate += impact.successRate;
          eventCount++;
        } catch (error) {
          // Skip events that don't exist or have errors
          continue;
        }
      }

      const averageSuccessRate = eventCount > 0 ? totalSuccessRate / eventCount : 0;

      return {
        success: true,
        data: {
          period: `${days} days`,
          eventsAnalyzed: eventCount,
          totalRevenueIncrease: Math.round(totalRevenueIncrease * 100) / 100,
          totalAppliedRecommendations,
          averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
          averageRevenuePerEvent: eventCount > 0 ? Math.round((totalRevenueIncrease / eventCount) * 100) / 100 : 0,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving analytics overview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ab-test')
  @ApiOperation({ summary: 'Create a new A/B test for pricing strategies' })
  @ApiResponse({ status: 201, description: 'A/B test created successfully' })
  async createABTest(@Body() dto: CreateABTestDto) {
    try {
      const abTest = await this.abTestingService.createABTest(dto);
      
      return {
        success: true,
        data: abTest,
        message: 'A/B test created successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error creating A/B test: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('ab-test/:testId/start')
  @ApiOperation({ summary: 'Start an A/B test' })
  @ApiResponse({ status: 200, description: 'A/B test started successfully' })
  async startABTest(@Param('testId') testId: string) {
    try {
      await this.abTestingService.startABTest(testId);
      
      return {
        success: true,
        message: 'A/B test started successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error starting A/B test: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('ab-test/:testId/pause')
  @ApiOperation({ summary: 'Pause an A/B test' })
  @ApiResponse({ status: 200, description: 'A/B test paused successfully' })
  async pauseABTest(@Param('testId') testId: string) {
    try {
      await this.abTestingService.pauseABTest(testId);
      
      return {
        success: true,
        message: 'A/B test paused successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error pausing A/B test: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('ab-test/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results and analysis' })
  @ApiResponse({ status: 200, description: 'A/B test results retrieved successfully' })
  async getABTestResults(@Param('testId') testId: string) {
    try {
      const results = await this.abTestingService.getABTestResults(testId);
      
      if (!results) {
        throw new HttpException('A/B test results not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error retrieving A/B test results: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('ab-test/:testId/complete')
  @ApiOperation({ summary: 'Complete an A/B test and get final results' })
  @ApiResponse({ status: 200, description: 'A/B test completed successfully' })
  async completeABTest(@Param('testId') testId: string) {
    try {
      const results = await this.abTestingService.completeABTest(testId);
      
      return {
        success: true,
        data: results,
        message: 'A/B test completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error completing A/B test: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get all A/B tests with optional filtering' })
  @ApiResponse({ status: 200, description: 'A/B tests retrieved successfully' })
  async getABTests(@Query('eventId') eventId?: string) {
    try {
      const tests = await this.abTestingService.getActiveABTests(eventId);
      
      return {
        success: true,
        data: tests,
        count: tests.length,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving A/B tests: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sample-size-calculator')
  @ApiOperation({ summary: 'Calculate required sample size for A/B test' })
  @ApiResponse({ status: 200, description: 'Sample size calculated successfully' })
  async calculateSampleSize(
    @Body() data: {
      baseConversionRate: number;
      minimumDetectableEffect: number;
      confidenceLevel?: number;
      power?: number;
    },
  ) {
    try {
      const { baseConversionRate, minimumDetectableEffect, confidenceLevel = 95, power = 80 } = data;

      if (baseConversionRate <= 0 || baseConversionRate >= 100) {
        throw new HttpException(
          'Base conversion rate must be between 0 and 100',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (minimumDetectableEffect <= 0) {
        throw new HttpException(
          'Minimum detectable effect must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sampleSize = await this.abTestingService.calculateSampleSize(
        baseConversionRate,
        minimumDetectableEffect,
        confidenceLevel,
        power,
      );

      return {
        success: true,
        data: {
          sampleSizePerVariant: sampleSize,
          totalSampleSize: sampleSize * 2, // Assuming 2 variants
          parameters: {
            baseConversionRate,
            minimumDetectableEffect,
            confidenceLevel,
            power,
          },
          estimatedDuration: {
            days: Math.ceil(sampleSize / 100), // Assuming 100 visitors per day
            note: 'Estimated based on 100 visitors per day per variant',
          },
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error calculating sample size: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('optimize-event/:eventId')
  @ApiOperation({ summary: 'Trigger comprehensive optimization analysis for an event' })
  @ApiResponse({ status: 200, description: 'Optimization analysis started successfully' })
  async optimizeEvent(@Param('eventId') eventId: string) {
    try {
      // Queue comprehensive optimization analysis
      const jobs = await Promise.all([
        this.pricingQueue.add('revenue-optimization-analysis', { eventId }),
        this.pricingQueue.add('price-elasticity-analysis', { eventId }),
        this.pricingQueue.add('calculate-prices', { eventId }),
      ]);

      return {
        success: true,
        message: 'Comprehensive optimization analysis started',
        jobIds: jobs.map(job => job.id),
        estimatedCompletionTime: '5-10 minutes',
      };
    } catch (error) {
      throw new HttpException(
        `Error starting optimization analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance-metrics')
  @ApiOperation({ summary: 'Get key performance metrics for the pricing system' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(@Query('days') days: number = 30) {
    try {
      // This would typically aggregate data from multiple events
      // For demonstration, we'll return sample metrics
      const metrics = {
        period: `${days} days`,
        totalEvents: 25,
        totalRevenueIncrease: 15750.50,
        averageRevenueIncrease: 15.3, // percentage
        recommendationsGenerated: 142,
        recommendationsApplied: 89,
        successRate: 62.7,
        abTestsCompleted: 8,
        abTestWinRate: 75.0,
        topPerformingStrategies: [
          { strategy: 'Demand-based pricing', successRate: 78.5, avgIncrease: 18.2 },
          { strategy: 'Time-based pricing', successRate: 65.3, avgIncrease: 12.8 },
          { strategy: 'Inventory-based pricing', successRate: 71.2, avgIncrease: 16.1 },
        ],
        marketSegments: [
          { segment: 'Concerts', avgIncrease: 19.4, events: 12 },
          { segment: 'Conferences', avgIncrease: 11.8, events: 8 },
          { segment: 'Sports', avgIncrease: 22.1, events: 5 },
        ],
      };

      return {
        success: true,
        data: metrics,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving performance metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recommendations/summary')
  @ApiOperation({ summary: 'Get summary of all pricing recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations summary retrieved successfully' })
  async getRecommendationsSummary(
    @Query('status') status?: string,
    @Query('days') days: number = 7,
  ) {
    try {
      const pendingRecommendations = await this.pricingOptimizationService.getPendingRecommendations();
      
      // Group recommendations by event
      const recommendationsByEvent = new Map();
      let totalPotentialIncrease = 0;

      for (const rec of pendingRecommendations) {
        if (!recommendationsByEvent.has(rec.eventId)) {
          recommendationsByEvent.set(rec.eventId, []);
        }
        recommendationsByEvent.get(rec.eventId).push(rec);
        totalPotentialIncrease += parseFloat(rec.expectedRevenueIncrease.toString());
      }

      const summary = {
        totalPendingRecommendations: pendingRecommendations.length,
        eventsWithRecommendations: recommendationsByEvent.size,
        totalPotentialIncrease: Math.round(totalPotentialIncrease * 100) / 100,
        averageIncreasePerRecommendation: pendingRecommendations.length > 0 
          ? Math.round((totalPotentialIncrease / pendingRecommendations.length) * 100) / 100 
          : 0,
        highValueRecommendations: pendingRecommendations.filter(
          rec => parseFloat(rec.expectedRevenueIncrease.toString()) > 100
        ).length,
        recommendationsByConfidence: {
          high: pendingRecommendations.filter(rec => rec.confidence >= 80).length,
          medium: pendingRecommendations.filter(rec => rec.confidence >= 60 && rec.confidence < 80).length,
          low: pendingRecommendations.filter(rec => rec.confidence < 60).length,
        },
        topRecommendations: pendingRecommendations
          .sort((a, b) => parseFloat(b.expectedRevenueIncrease.toString()) - parseFloat(a.expectedRevenueIncrease.toString()))
          .slice(0, 10),
      };

      return {
        success: true,
        data: summary,
        period: `${days} days`,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving recommendations summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
