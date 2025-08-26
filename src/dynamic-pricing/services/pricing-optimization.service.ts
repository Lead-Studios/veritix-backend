import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PriceRecommendation, RecommendationStatus } from '../entities/price-recommendation.entity';
import { PricingHistory } from '../entities/pricing-history.entity';
import { PricingEngineService, PricingContext, PricingResult } from './pricing-engine.service';
import { DemandAnalysisService } from './demand-analysis.service';
import { CompetitorMonitoringService } from './competitor-monitoring.service';

export interface RevenueOptimizationReport {
  eventId: string;
  currentRevenue: number;
  projectedRevenue: number;
  revenueIncrease: number;
  revenueIncreasePercentage: number;
  recommendations: Array<{
    ticketTierId: string;
    currentPrice: number;
    recommendedPrice: number;
    expectedIncrease: number;
    confidence: number;
  }>;
  marketAnalysis: {
    demandTrend: string;
    competitivePosition: string;
    optimalPriceRange: { min: number; max: number };
  };
}

export interface PriceElasticityAnalysis {
  eventId: string;
  priceElasticity: number;
  optimalPrice: number;
  revenueMaximizingPrice: number;
  demandCurve: Array<{
    price: number;
    expectedDemand: number;
    expectedRevenue: number;
  }>;
}

@Injectable()
export class PricingOptimizationService {
  private readonly logger = new Logger(PricingOptimizationService.name);

  constructor(
    @InjectRepository(PriceRecommendation)
    private priceRecommendationRepository: Repository<PriceRecommendation>,
    @InjectRepository(PricingHistory)
    private pricingHistoryRepository: Repository<PricingHistory>,
    private pricingEngineService: PricingEngineService,
    private demandAnalysisService: DemandAnalysisService,
    private competitorMonitoringService: CompetitorMonitoringService,
  ) {}

  async generatePriceRecommendation(context: PricingContext): Promise<PriceRecommendation> {
    try {
      // Calculate optimal pricing
      const pricingResult = await this.pricingEngineService.calculateOptimalPrice(context);
      
      // Get market analysis
      const competitorAnalysis = await this.competitorMonitoringService.analyzeCompetitorPricing(
        context.eventType,
        context.location,
        context.currentPrice,
        context.eventDate
      );
      
      // Calculate price elasticity
      const elasticityAnalysis = await this.analyzePriceElasticity(context);
      
      // Create recommendation
      const recommendation = this.priceRecommendationRepository.create({
        eventId: context.eventId,
        ticketTierId: context.ticketTierId,
        currentPrice: context.currentPrice,
        recommendedPrice: pricingResult.recommendedPrice,
        priceChange: ((pricingResult.recommendedPrice - context.currentPrice) / context.currentPrice) * 100,
        expectedRevenueIncrease: pricingResult.expectedRevenueIncrease,
        confidence: pricingResult.confidence,
        reason: this.generateRecommendationReason(pricingResult),
        factors: pricingResult.factors,
        marketAnalysis: {
          demandTrend: await this.getDemandTrend(context.eventId),
          competitivePosition: competitorAnalysis.pricePosition,
          priceElasticity: elasticityAnalysis.priceElasticity,
          optimalPriceRange: {
            min: elasticityAnalysis.optimalPrice * 0.9,
            max: elasticityAnalysis.optimalPrice * 1.1,
          },
        },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours
      });

      return await this.priceRecommendationRepository.save(recommendation);

    } catch (error) {
      this.logger.error(`Error generating price recommendation:`, error);
      throw error;
    }
  }

  private generateRecommendationReason(pricingResult: PricingResult): string {
    const reasons = [];
    
    if (pricingResult.factors.demandScore > 70) {
      reasons.push('High demand detected');
    } else if (pricingResult.factors.demandScore < 30) {
      reasons.push('Low demand, price reduction recommended');
    }
    
    if (pricingResult.factors.inventoryLevel < 20) {
      reasons.push('Low inventory, scarcity pricing applied');
    } else if (pricingResult.factors.inventoryLevel > 80) {
      reasons.push('High inventory, promotional pricing suggested');
    }
    
    if (pricingResult.factors.timeToEvent < 48) {
      reasons.push('Last-minute premium pricing');
    } else if (pricingResult.factors.timeToEvent > 720) {
      reasons.push('Early-bird pricing opportunity');
    }
    
    if (pricingResult.factors.competitorPricing > 0) {
      reasons.push('Competitive pricing adjustment');
    }
    
    return reasons.join(', ') || 'Standard pricing optimization';
  }

  private async getDemandTrend(eventId: string): Promise<string> {
    const analysis = await this.demandAnalysisService.analyzeDemand(eventId);
    return analysis.trend;
  }

  async generateRevenueOptimizationReport(eventId: string): Promise<RevenueOptimizationReport> {
    try {
      // This would typically get ticket tiers from your ticket system
      // For now, we'll simulate with sample data
      const ticketTiers = await this.getEventTicketTiers(eventId);
      
      let currentRevenue = 0;
      let projectedRevenue = 0;
      const recommendations = [];

      for (const tier of ticketTiers) {
        const context: PricingContext = {
          eventId,
          ticketTierId: tier.id,
          currentPrice: tier.price,
          inventoryLevel: tier.availableTickets,
          totalCapacity: tier.totalCapacity,
          timeToEvent: tier.timeToEvent,
          eventDate: tier.eventDate,
          eventType: tier.eventType,
          location: tier.location,
        };

        const pricingResult = await this.pricingEngineService.calculateOptimalPrice(context);
        
        const tierCurrentRevenue = tier.price * (tier.totalCapacity - tier.availableTickets);
        const tierProjectedRevenue = pricingResult.recommendedPrice * (tier.totalCapacity - tier.availableTickets);
        
        currentRevenue += tierCurrentRevenue;
        projectedRevenue += tierProjectedRevenue;

        recommendations.push({
          ticketTierId: tier.id,
          currentPrice: tier.price,
          recommendedPrice: pricingResult.recommendedPrice,
          expectedIncrease: tierProjectedRevenue - tierCurrentRevenue,
          confidence: pricingResult.confidence,
        });
      }

      // Get market analysis for the event
      const sampleTier = ticketTiers[0];
      const competitorAnalysis = await this.competitorMonitoringService.analyzeCompetitorPricing(
        sampleTier.eventType,
        sampleTier.location,
        sampleTier.price,
        sampleTier.eventDate
      );

      const demandAnalysis = await this.demandAnalysisService.analyzeDemand(eventId);

      return {
        eventId,
        currentRevenue: Math.round(currentRevenue * 100) / 100,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        revenueIncrease: Math.round((projectedRevenue - currentRevenue) * 100) / 100,
        revenueIncreasePercentage: currentRevenue > 0 ? Math.round(((projectedRevenue - currentRevenue) / currentRevenue) * 10000) / 100 : 0,
        recommendations,
        marketAnalysis: {
          demandTrend: demandAnalysis.trend,
          competitivePosition: competitorAnalysis.pricePosition,
          optimalPriceRange: competitorAnalysis.priceRange,
        },
      };

    } catch (error) {
      this.logger.error(`Error generating revenue optimization report:`, error);
      throw error;
    }
  }

  private async getEventTicketTiers(eventId: string): Promise<Array<{
    id: string;
    price: number;
    availableTickets: number;
    totalCapacity: number;
    timeToEvent: number;
    eventDate: Date;
    eventType: string;
    location: string;
  }>> {
    // This would typically query your ticket tiers from the database
    // For demonstration, returning mock data
    const mockEventDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const timeToEvent = (mockEventDate.getTime() - Date.now()) / (1000 * 60 * 60);

    return [
      {
        id: 'tier-1',
        price: 50.00,
        availableTickets: 150,
        totalCapacity: 200,
        timeToEvent,
        eventDate: mockEventDate,
        eventType: 'concert',
        location: 'New York',
      },
      {
        id: 'tier-2',
        price: 75.00,
        availableTickets: 80,
        totalCapacity: 100,
        timeToEvent,
        eventDate: mockEventDate,
        eventType: 'concert',
        location: 'New York',
      },
    ];
  }

  async analyzePriceElasticity(context: PricingContext): Promise<PriceElasticityAnalysis> {
    try {
      // Get historical pricing data
      const historicalData = await this.pricingHistoryRepository.find({
        where: { eventId: context.eventId },
        order: { createdAt: 'DESC' },
        take: 50,
      });

      if (historicalData.length < 10) {
        // Not enough data, use industry averages
        return this.getDefaultElasticityAnalysis(context);
      }

      // Calculate price elasticity using historical data
      const priceElasticity = this.calculatePriceElasticity(historicalData);
      
      // Generate demand curve
      const demandCurve = this.generateDemandCurve(context, priceElasticity);
      
      // Find revenue-maximizing price
      const revenueMaximizingPrice = this.findRevenueMaximizingPrice(demandCurve);
      
      return {
        eventId: context.eventId,
        priceElasticity,
        optimalPrice: context.currentPrice * (1 + (priceElasticity * 0.1)), // Simplified optimization
        revenueMaximizingPrice,
        demandCurve,
      };

    } catch (error) {
      this.logger.error(`Error analyzing price elasticity:`, error);
      return this.getDefaultElasticityAnalysis(context);
    }
  }

  private calculatePriceElasticity(historicalData: PricingHistory[]): number {
    if (historicalData.length < 2) return -1.0;

    // Simple elasticity calculation using adjacent data points
    let totalElasticity = 0;
    let validPairs = 0;

    for (let i = 1; i < historicalData.length; i++) {
      const current = historicalData[i];
      const previous = historicalData[i - 1];

      const priceChange = (parseFloat(current.adjustedPrice.toString()) - parseFloat(previous.adjustedPrice.toString())) / parseFloat(previous.adjustedPrice.toString());
      
      // Simulate demand change (in real implementation, this would come from actual sales data)
      const demandChange = this.simulateDemandChange(current, previous);

      if (priceChange !== 0) {
        const elasticity = demandChange / priceChange;
        totalElasticity += elasticity;
        validPairs++;
      }
    }

    return validPairs > 0 ? totalElasticity / validPairs : -1.0;
  }

  private simulateDemandChange(current: PricingHistory, previous: PricingHistory): number {
    // In a real implementation, this would use actual sales/demand data
    // For simulation, we'll use market conditions to estimate demand change
    const demandScoreChange = (current.marketConditions.demandScore - previous.marketConditions.demandScore) / 100;
    const inventoryChange = (current.marketConditions.inventoryLevel - previous.marketConditions.inventoryLevel) / 100;
    
    // Simplified demand change estimation
    return demandScoreChange - (inventoryChange * 0.5);
  }

  private generateDemandCurve(context: PricingContext, elasticity: number): Array<{
    price: number;
    expectedDemand: number;
    expectedRevenue: number;
  }> {
    const baseDemand = context.totalCapacity - context.inventoryLevel;
    const basePrice = context.currentPrice;
    const curve = [];

    // Generate curve from 50% to 200% of current price
    for (let priceMultiplier = 0.5; priceMultiplier <= 2.0; priceMultiplier += 0.1) {
      const price = basePrice * priceMultiplier;
      const priceChange = (price - basePrice) / basePrice;
      const demandChange = elasticity * priceChange;
      const expectedDemand = Math.max(0, baseDemand * (1 + demandChange));
      const expectedRevenue = price * expectedDemand;

      curve.push({
        price: Math.round(price * 100) / 100,
        expectedDemand: Math.round(expectedDemand),
        expectedRevenue: Math.round(expectedRevenue * 100) / 100,
      });
    }

    return curve;
  }

  private findRevenueMaximizingPrice(demandCurve: Array<{ price: number; expectedRevenue: number }>): number {
    let maxRevenue = 0;
    let optimalPrice = 0;

    for (const point of demandCurve) {
      if (point.expectedRevenue > maxRevenue) {
        maxRevenue = point.expectedRevenue;
        optimalPrice = point.price;
      }
    }

    return optimalPrice;
  }

  private getDefaultElasticityAnalysis(context: PricingContext): PriceElasticityAnalysis {
    const defaultElasticity = -1.2; // Typical elasticity for event tickets
    const demandCurve = this.generateDemandCurve(context, defaultElasticity);
    const revenueMaximizingPrice = this.findRevenueMaximizingPrice(demandCurve);

    return {
      eventId: context.eventId,
      priceElasticity: defaultElasticity,
      optimalPrice: context.currentPrice * 1.05, // 5% increase as default
      revenueMaximizingPrice,
      demandCurve,
    };
  }

  async applyPriceRecommendation(recommendationId: string): Promise<void> {
    try {
      const recommendation = await this.priceRecommendationRepository.findOne({
        where: { id: recommendationId },
      });

      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      if (recommendation.status !== RecommendationStatus.PENDING) {
        throw new Error('Recommendation is not in pending status');
      }

      // In a real implementation, this would update the actual ticket prices
      // For now, we'll just mark the recommendation as applied
      recommendation.status = RecommendationStatus.APPLIED;
      recommendation.appliedAt = new Date();

      await this.priceRecommendationRepository.save(recommendation);

      this.logger.log(`Applied price recommendation ${recommendationId}: ${recommendation.currentPrice} -> ${recommendation.recommendedPrice}`);

    } catch (error) {
      this.logger.error(`Error applying price recommendation ${recommendationId}:`, error);
      throw error;
    }
  }

  async rejectPriceRecommendation(recommendationId: string): Promise<void> {
    try {
      const recommendation = await this.priceRecommendationRepository.findOne({
        where: { id: recommendationId },
      });

      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      recommendation.status = RecommendationStatus.REJECTED;
      await this.priceRecommendationRepository.save(recommendation);

      this.logger.log(`Rejected price recommendation ${recommendationId}`);

    } catch (error) {
      this.logger.error(`Error rejecting price recommendation ${recommendationId}:`, error);
      throw error;
    }
  }

  async getPendingRecommendations(eventId?: string): Promise<PriceRecommendation[]> {
    const whereClause: any = {
      status: RecommendationStatus.PENDING,
      validUntil: Between(new Date(), new Date('2099-12-31')),
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    return this.priceRecommendationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldRecommendations(): Promise<void> {
    try {
      const now = new Date();
      
      const result = await this.priceRecommendationRepository.update(
        {
          status: RecommendationStatus.PENDING,
          validUntil: Between(new Date('1970-01-01'), now),
        },
        {
          status: RecommendationStatus.EXPIRED,
        }
      );

      if (result.affected && result.affected > 0) {
        this.logger.log(`Expired ${result.affected} old price recommendations`);
      }

    } catch (error) {
      this.logger.error('Error expiring old recommendations:', error);
    }
  }

  async getRevenueImpactAnalysis(eventId: string, days: number = 30): Promise<{
    totalRevenueImpact: number;
    appliedRecommendations: number;
    averageRevenueIncrease: number;
    successRate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const appliedRecommendations = await this.priceRecommendationRepository.find({
        where: {
          eventId,
          status: RecommendationStatus.APPLIED,
          appliedAt: Between(startDate, new Date()),
        },
      });

      const totalRevenueImpact = appliedRecommendations.reduce(
        (sum, rec) => sum + parseFloat(rec.expectedRevenueIncrease.toString()),
        0
      );

      const averageRevenueIncrease = appliedRecommendations.length > 0 
        ? totalRevenueImpact / appliedRecommendations.length 
        : 0;

      // Calculate success rate (recommendations that were applied vs total recommendations)
      const totalRecommendations = await this.priceRecommendationRepository.count({
        where: {
          eventId,
          createdAt: Between(startDate, new Date()),
        },
      });

      const successRate = totalRecommendations > 0 
        ? (appliedRecommendations.length / totalRecommendations) * 100 
        : 0;

      return {
        totalRevenueImpact: Math.round(totalRevenueImpact * 100) / 100,
        appliedRecommendations: appliedRecommendations.length,
        averageRevenueIncrease: Math.round(averageRevenueIncrease * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
      };

    } catch (error) {
      this.logger.error(`Error calculating revenue impact analysis:`, error);
      return {
        totalRevenueImpact: 0,
        appliedRecommendations: 0,
        averageRevenueIncrease: 0,
        successRate: 0,
      };
    }
  }
}
