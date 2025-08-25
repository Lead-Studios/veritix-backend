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

import { PricingEngineService, PricingContext } from '../services/pricing-engine.service';
import { PricingOptimizationService } from '../services/pricing-optimization.service';
import { DemandAnalysisService } from '../services/demand-analysis.service';
import { CompetitorMonitoringService } from '../services/competitor-monitoring.service';
import { ABTestingService } from '../services/ab-testing.service';

import { CreatePriceRecommendationDto } from '../dto/create-price-recommendation.dto';
import { RecordDemandMetricDto } from '../dto/record-demand-metric.dto';
import { CompetitorPriceDto } from '../dto/competitor-price.dto';

@ApiTags('Dynamic Pricing')
@Controller('dynamic-pricing')
@ApiBearerAuth()
export class DynamicPricingController {
  constructor(
    private pricingEngineService: PricingEngineService,
    private pricingOptimizationService: PricingOptimizationService,
    private demandAnalysisService: DemandAnalysisService,
    private competitorMonitoringService: CompetitorMonitoringService,
    private abTestingService: ABTestingService,
  ) {}

  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate optimal price for an event/ticket tier' })
  @ApiResponse({ status: 200, description: 'Price calculation completed successfully' })
  async calculateOptimalPrice(@Body() context: PricingContext) {
    try {
      const result = await this.pricingEngineService.calculateOptimalPrice(context);
      return {
        success: true,
        data: result,
        message: 'Price calculation completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error calculating optimal price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('price-recommendation')
  @ApiOperation({ summary: 'Generate price recommendation' })
  @ApiResponse({ status: 201, description: 'Price recommendation generated successfully' })
  async generatePriceRecommendation(@Body() dto: CreatePriceRecommendationDto) {
    try {
      const context: PricingContext = {
        eventId: dto.eventId,
        ticketTierId: dto.ticketTierId,
        currentPrice: dto.currentPrice,
        inventoryLevel: dto.inventoryLevel,
        totalCapacity: dto.totalCapacity,
        timeToEvent: dto.timeToEvent,
        eventDate: dto.eventDate,
        eventType: dto.eventType,
        location: dto.location,
      };

      const recommendation = await this.pricingOptimizationService.generatePriceRecommendation(context);
      
      return {
        success: true,
        data: recommendation,
        message: 'Price recommendation generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error generating price recommendation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recommendations/:eventId')
  @ApiOperation({ summary: 'Get pending price recommendations for an event' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getPendingRecommendations(@Param('eventId') eventId: string) {
    try {
      const recommendations = await this.pricingOptimizationService.getPendingRecommendations(eventId);
      
      return {
        success: true,
        data: recommendations,
        count: recommendations.length,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('recommendations/:recommendationId/apply')
  @ApiOperation({ summary: 'Apply a price recommendation' })
  @ApiResponse({ status: 200, description: 'Recommendation applied successfully' })
  async applyRecommendation(@Param('recommendationId') recommendationId: string) {
    try {
      await this.pricingOptimizationService.applyPriceRecommendation(recommendationId);
      
      return {
        success: true,
        message: 'Price recommendation applied successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error applying recommendation: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('recommendations/:recommendationId/reject')
  @ApiOperation({ summary: 'Reject a price recommendation' })
  @ApiResponse({ status: 200, description: 'Recommendation rejected successfully' })
  async rejectRecommendation(@Param('recommendationId') recommendationId: string) {
    try {
      await this.pricingOptimizationService.rejectPriceRecommendation(recommendationId);
      
      return {
        success: true,
        message: 'Price recommendation rejected successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error rejecting recommendation: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('demand-analysis/:eventId')
  @ApiOperation({ summary: 'Get demand analysis for an event' })
  @ApiResponse({ status: 200, description: 'Demand analysis retrieved successfully' })
  async getDemandAnalysis(@Param('eventId') eventId: string) {
    try {
      const analysis = await this.demandAnalysisService.analyzeDemand(eventId);
      
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving demand analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('demand-metric')
  @ApiOperation({ summary: 'Record a demand metric' })
  @ApiResponse({ status: 201, description: 'Demand metric recorded successfully' })
  async recordDemandMetric(@Body() dto: RecordDemandMetricDto) {
    try {
      await this.demandAnalysisService.recordDemandMetric(
        dto.eventId,
        dto.metricType,
        dto.value,
        dto.count,
        dto.timeWindow,
        dto.metadata,
      );
      
      return {
        success: true,
        message: 'Demand metric recorded successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error recording demand metric: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('demand-trends/:eventId')
  @ApiOperation({ summary: 'Get demand trends for an event' })
  @ApiResponse({ status: 200, description: 'Demand trends retrieved successfully' })
  async getDemandTrends(
    @Param('eventId') eventId: string,
    @Query('days') days: number = 7,
  ) {
    try {
      const trends = await this.demandAnalysisService.getDemandTrends(eventId, days);
      
      return {
        success: true,
        data: trends,
        period: `${days} days`,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving demand trends: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('competitor-analysis')
  @ApiOperation({ summary: 'Get competitor pricing analysis' })
  @ApiResponse({ status: 200, description: 'Competitor analysis retrieved successfully' })
  async getCompetitorAnalysis(
    @Query('eventType') eventType: string,
    @Query('location') location: string,
    @Query('currentPrice') currentPrice: number,
  ) {
    try {
      if (!eventType || !location || !currentPrice) {
        throw new HttpException(
          'eventType, location, and currentPrice are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const eventDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Mock event date
      const analysis = await this.competitorMonitoringService.analyzeCompetitorPricing(
        eventType,
        location,
        currentPrice,
        eventDate,
      );
      
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving competitor analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('competitor-price')
  @ApiOperation({ summary: 'Record competitor price data' })
  @ApiResponse({ status: 201, description: 'Competitor price recorded successfully' })
  async recordCompetitorPrice(@Body() dto: CompetitorPriceDto) {
    try {
      await this.competitorMonitoringService.recordCompetitorPrice(dto);
      
      return {
        success: true,
        message: 'Competitor price recorded successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error recording competitor price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('competitor-trends')
  @ApiOperation({ summary: 'Get competitor pricing trends' })
  @ApiResponse({ status: 200, description: 'Competitor trends retrieved successfully' })
  async getCompetitorTrends(
    @Query('eventType') eventType: string,
    @Query('location') location: string,
    @Query('days') days: number = 30,
  ) {
    try {
      if (!eventType || !location) {
        throw new HttpException(
          'eventType and location are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const trends = await this.competitorMonitoringService.getCompetitorTrends(
        eventType,
        location,
        days,
      );
      
      return {
        success: true,
        data: trends,
        period: `${days} days`,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving competitor trends: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revenue-optimization/:eventId')
  @ApiOperation({ summary: 'Get revenue optimization report for an event' })
  @ApiResponse({ status: 200, description: 'Revenue optimization report generated successfully' })
  async getRevenueOptimizationReport(@Param('eventId') eventId: string) {
    try {
      const report = await this.pricingOptimizationService.generateRevenueOptimizationReport(eventId);
      
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        `Error generating revenue optimization report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('price-elasticity/:eventId')
  @ApiOperation({ summary: 'Get price elasticity analysis for an event' })
  @ApiResponse({ status: 200, description: 'Price elasticity analysis retrieved successfully' })
  async getPriceElasticityAnalysis(
    @Param('eventId') eventId: string,
    @Query('ticketTierId') ticketTierId?: string,
  ) {
    try {
      // Mock context for elasticity analysis
      const context: PricingContext = {
        eventId,
        ticketTierId,
        currentPrice: 50.00, // This would come from your ticket service
        inventoryLevel: 100,
        totalCapacity: 200,
        timeToEvent: 720, // 30 days
        eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        eventType: 'concert',
        location: 'New York',
      };

      const analysis = await this.pricingOptimizationService.analyzePriceElasticity(context);
      
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      throw new HttpException(
        `Error analyzing price elasticity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ab-test/:eventId/variant')
  @ApiOperation({ summary: 'Get A/B test variant for a user' })
  @ApiResponse({ status: 200, description: 'A/B test variant retrieved successfully' })
  async getABTestVariant(
    @Param('eventId') eventId: string,
    @Query('userId') userId: string,
  ) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const variant = await this.abTestingService.getVariantForUser(eventId, userId);
      
      return {
        success: true,
        data: {
          eventId,
          userId,
          variant,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving A/B test variant: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ab-test/:testId/conversion')
  @ApiOperation({ summary: 'Record A/B test conversion' })
  @ApiResponse({ status: 201, description: 'Conversion recorded successfully' })
  async recordABTestConversion(
    @Param('testId') testId: string,
    @Body() data: {
      variantId: string;
      userId: string;
      revenue?: number;
    },
  ) {
    try {
      await this.abTestingService.recordConversion(
        testId,
        data.variantId,
        data.userId,
        data.revenue,
      );
      
      return {
        success: true,
        message: 'Conversion recorded successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error recording conversion: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revenue-impact/:eventId')
  @ApiOperation({ summary: 'Get revenue impact analysis for an event' })
  @ApiResponse({ status: 200, description: 'Revenue impact analysis retrieved successfully' })
  async getRevenueImpactAnalysis(
    @Param('eventId') eventId: string,
    @Query('days') days: number = 30,
  ) {
    try {
      const analysis = await this.pricingOptimizationService.getRevenueImpactAnalysis(eventId, days);
      
      return {
        success: true,
        data: analysis,
        period: `${days} days`,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving revenue impact analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('top-demand-events')
  @ApiOperation({ summary: 'Get events with highest demand' })
  @ApiResponse({ status: 200, description: 'Top demand events retrieved successfully' })
  async getTopDemandEvents(@Query('limit') limit: number = 10) {
    try {
      const events = await this.demandAnalysisService.getTopDemandEvents(limit);
      
      return {
        success: true,
        data: events,
        limit,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving top demand events: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('schedule-price-calculation/:eventId')
  @ApiOperation({ summary: 'Schedule price calculation for an event' })
  @ApiResponse({ status: 200, description: 'Price calculation scheduled successfully' })
  async schedulePriceCalculation(
    @Param('eventId') eventId: string,
    @Body() data: { delay?: number } = {},
  ) {
    try {
      await this.pricingEngineService.schedulePriceCalculation(eventId, data.delay);
      
      return {
        success: true,
        message: 'Price calculation scheduled successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error scheduling price calculation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
