import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { PricingRule, PricingRuleType } from '../entities/pricing-rule.entity';
import { PricingHistory } from '../entities/pricing-history.entity';
import { PriceRecommendation } from '../entities/price-recommendation.entity';
import { DemandAnalysisService } from './demand-analysis.service';
import { CompetitorMonitoringService } from './competitor-monitoring.service';
import { ABTestingService } from './ab-testing.service';

export interface PricingContext {
  eventId: string;
  ticketTierId?: string;
  currentPrice: number;
  inventoryLevel: number;
  totalCapacity: number;
  timeToEvent: number; // hours
  eventDate: Date;
  eventType: string;
  location: string;
}

export interface PricingResult {
  recommendedPrice: number;
  multiplier: number;
  confidence: number;
  factors: {
    demandScore: number;
    inventoryLevel: number;
    timeToEvent: number;
    competitorPricing: number;
    seasonalFactor: number;
    historicalPerformance: number;
  };
  appliedRules: string[];
  expectedRevenueIncrease: number;
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);

  constructor(
    @InjectRepository(PricingRule)
    private pricingRuleRepository: Repository<PricingRule>,
    @InjectRepository(PricingHistory)
    private pricingHistoryRepository: Repository<PricingHistory>,
    @InjectRepository(PriceRecommendation)
    private priceRecommendationRepository: Repository<PriceRecommendation>,
    @InjectQueue('pricing-calculation')
    private pricingQueue: Queue,
    private demandAnalysisService: DemandAnalysisService,
    private competitorMonitoringService: CompetitorMonitoringService,
    private abTestingService: ABTestingService,
  ) {}

  async calculateOptimalPrice(context: PricingContext): Promise<PricingResult> {
    const startTime = Date.now();
    
    try {
      // Get active pricing rules for the event
      const rules = await this.getActivePricingRules(context.eventId);
      
      // Analyze current market conditions
      const demandScore = await this.demandAnalysisService.calculateDemandScore(context.eventId);
      const competitorPricing = await this.competitorMonitoringService.getAverageCompetitorPrice(
        context.eventType,
        context.location
      );
      
      // Calculate seasonal factor
      const seasonalFactor = this.calculateSeasonalFactor(context.eventDate);
      
      // Get historical performance data
      const historicalPerformance = await this.getHistoricalPerformance(context);
      
      // Apply pricing rules
      let finalMultiplier = 1.0;
      const appliedRules: string[] = [];
      
      for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
        const ruleMultiplier = await this.applyPricingRule(rule, context, {
          demandScore,
          competitorPricing,
          seasonalFactor,
        });
        
        if (ruleMultiplier !== 1.0) {
          finalMultiplier *= ruleMultiplier;
          appliedRules.push(rule.name);
        }
      }
      
      // Apply constraints
      const constrainedMultiplier = this.applyConstraints(finalMultiplier, rules);
      
      // Calculate final price
      const recommendedPrice = Math.round(context.currentPrice * constrainedMultiplier * 100) / 100;
      
      // Calculate confidence based on data quality and rule coverage
      const confidence = this.calculateConfidence({
        demandScore,
        competitorPricing,
        appliedRules: appliedRules.length,
        historicalData: historicalPerformance > 0,
      });
      
      // Estimate revenue increase
      const expectedRevenueIncrease = this.estimateRevenueIncrease(
        context,
        recommendedPrice,
        demandScore
      );
      
      const result: PricingResult = {
        recommendedPrice,
        multiplier: constrainedMultiplier,
        confidence,
        factors: {
          demandScore,
          inventoryLevel: (context.inventoryLevel / context.totalCapacity) * 100,
          timeToEvent: context.timeToEvent,
          competitorPricing: competitorPricing || 0,
          seasonalFactor,
          historicalPerformance,
        },
        appliedRules,
        expectedRevenueIncrease,
      };
      
      // Save pricing history
      await this.savePricingHistory(context, result, Date.now() - startTime);
      
      this.logger.log(`Pricing calculation completed for event ${context.eventId}: ${context.currentPrice} -> ${recommendedPrice} (${Math.round((constrainedMultiplier - 1) * 100)}%)`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`Error calculating optimal price for event ${context.eventId}:`, error);
      throw error;
    }
  }

  private async getActivePricingRules(eventId: string): Promise<PricingRule[]> {
    return this.pricingRuleRepository.find({
      where: {
        eventId,
        isActive: true,
        status: 'active',
      },
      order: { priority: 'DESC' },
    });
  }

  private async applyPricingRule(
    rule: PricingRule,
    context: PricingContext,
    marketData: any
  ): Promise<number> {
    let multiplier = 1.0;
    
    switch (rule.type) {
      case PricingRuleType.TIME_BASED:
        multiplier = this.applyTimeBasedRule(rule, context);
        break;
        
      case PricingRuleType.DEMAND_BASED:
        multiplier = this.applyDemandBasedRule(rule, marketData.demandScore);
        break;
        
      case PricingRuleType.INVENTORY_BASED:
        multiplier = this.applyInventoryBasedRule(rule, context);
        break;
        
      case PricingRuleType.COMPETITOR_BASED:
        multiplier = this.applyCompetitorBasedRule(rule, marketData.competitorPricing, context.currentPrice);
        break;
        
      case PricingRuleType.SEASONAL:
        multiplier = this.applySeasonalRule(rule, context.eventDate);
        break;
        
      case PricingRuleType.DYNAMIC_MULTIPLIER:
        multiplier = this.applyDynamicMultiplierRule(rule, context, marketData);
        break;
    }
    
    return Math.max(rule.minMultiplier, Math.min(rule.maxMultiplier, multiplier));
  }

  private applyTimeBasedRule(rule: PricingRule, context: PricingContext): number {
    const timeRanges = rule.conditions.timeRanges || [];
    const now = new Date();
    
    for (const range of timeRanges) {
      const startDate = new Date(range.startDate);
      const endDate = new Date(range.endDate);
      
      if (now >= startDate && now <= endDate) {
        return range.multiplier;
      }
    }
    
    // Default early bird and last minute pricing
    if (context.timeToEvent > 720) { // More than 30 days
      return 0.8; // Early bird discount
    } else if (context.timeToEvent < 24) { // Less than 24 hours
      return 1.2; // Last minute premium
    }
    
    return 1.0;
  }

  private applyDemandBasedRule(rule: PricingRule, demandScore: number): number {
    const thresholds = rule.conditions.demandThresholds || [];
    
    for (const threshold of thresholds) {
      if (demandScore >= threshold.minDemand && demandScore <= threshold.maxDemand) {
        return threshold.multiplier;
      }
    }
    
    // Default demand-based pricing
    if (demandScore > 80) return 1.3;
    if (demandScore > 60) return 1.1;
    if (demandScore < 20) return 0.9;
    
    return 1.0;
  }

  private applyInventoryBasedRule(rule: PricingRule, context: PricingContext): number {
    const inventoryPercentage = (context.inventoryLevel / context.totalCapacity) * 100;
    const thresholds = rule.conditions.inventoryThresholds || [];
    
    for (const threshold of thresholds) {
      if (inventoryPercentage >= threshold.minInventory && inventoryPercentage <= threshold.maxInventory) {
        return threshold.multiplier;
      }
    }
    
    // Default inventory-based pricing
    if (inventoryPercentage < 10) return 1.5; // Scarcity premium
    if (inventoryPercentage < 25) return 1.2;
    if (inventoryPercentage > 75) return 0.9; // Excess inventory discount
    
    return 1.0;
  }

  private applyCompetitorBasedRule(rule: PricingRule, competitorPrice: number, currentPrice: number): number {
    if (!competitorPrice) return 1.0;
    
    const ranges = rule.conditions.competitorPriceRanges || [];
    
    for (const range of ranges) {
      if (competitorPrice >= range.minPrice && competitorPrice <= range.maxPrice) {
        return range.multiplier;
      }
    }
    
    // Default competitive pricing
    const priceRatio = currentPrice / competitorPrice;
    if (priceRatio > 1.2) return 0.95; // We're too expensive
    if (priceRatio < 0.8) return 1.05; // We're too cheap
    
    return 1.0;
  }

  private applySeasonalRule(rule: PricingRule, eventDate: Date): number {
    const month = eventDate.getMonth() + 1;
    const factors = rule.conditions.seasonalFactors || [];
    
    const seasonalFactor = factors.find(f => f.month === month);
    return seasonalFactor ? seasonalFactor.multiplier : 1.0;
  }

  private applyDynamicMultiplierRule(rule: PricingRule, context: PricingContext, marketData: any): number {
    // Complex algorithm combining multiple factors
    const weights = {
      demand: 0.3,
      inventory: 0.25,
      time: 0.2,
      competitor: 0.15,
      seasonal: 0.1,
    };
    
    const factors = {
      demand: Math.min(marketData.demandScore / 50, 2),
      inventory: Math.max(0.5, 2 - (context.inventoryLevel / context.totalCapacity) * 2),
      time: context.timeToEvent < 48 ? 1.2 : context.timeToEvent > 720 ? 0.8 : 1.0,
      competitor: marketData.competitorPricing ? Math.min(marketData.competitorPricing / context.currentPrice, 1.5) : 1.0,
      seasonal: marketData.seasonalFactor,
    };
    
    let weightedMultiplier = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      weightedMultiplier += factors[factor] * weight;
    }
    
    return weightedMultiplier;
  }

  private applyConstraints(multiplier: number, rules: PricingRule[]): number {
    const globalMin = Math.min(...rules.map(r => r.minMultiplier));
    const globalMax = Math.max(...rules.map(r => r.maxMultiplier));
    
    return Math.max(globalMin, Math.min(globalMax, multiplier));
  }

  private calculateSeasonalFactor(eventDate: Date): number {
    const month = eventDate.getMonth() + 1;
    const seasonalFactors = {
      12: 1.2, // December - holiday season
      1: 1.1,  // January - New Year
      2: 0.9,  // February - low season
      3: 1.0,  // March
      4: 1.1,  // April - spring events
      5: 1.2,  // May - wedding season
      6: 1.3,  // June - peak wedding season
      7: 1.2,  // July - summer events
      8: 1.1,  // August
      9: 1.0,  // September
      10: 1.1, // October - fall events
      11: 1.0, // November
    };
    
    return seasonalFactors[month] || 1.0;
  }

  private async getHistoricalPerformance(context: PricingContext): Promise<number> {
    const history = await this.pricingHistoryRepository.find({
      where: { eventId: context.eventId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    
    if (history.length === 0) return 0;
    
    const avgMultiplier = history.reduce((sum, h) => sum + parseFloat(h.multiplier.toString()), 0) / history.length;
    return avgMultiplier;
  }

  private calculateConfidence(factors: {
    demandScore: number;
    competitorPricing: number;
    appliedRules: number;
    historicalData: boolean;
  }): number {
    let confidence = 50; // Base confidence
    
    // Demand data quality
    if (factors.demandScore > 0) confidence += 20;
    
    // Competitor data availability
    if (factors.competitorPricing > 0) confidence += 15;
    
    // Rule coverage
    confidence += Math.min(factors.appliedRules * 5, 10);
    
    // Historical data
    if (factors.historicalData) confidence += 5;
    
    return Math.min(confidence, 95);
  }

  private estimateRevenueIncrease(
    context: PricingContext,
    recommendedPrice: number,
    demandScore: number
  ): number {
    const priceIncrease = recommendedPrice - context.currentPrice;
    const demandElasticity = this.calculateDemandElasticity(demandScore);
    
    // Simple revenue estimation model
    const priceChangePercent = priceIncrease / context.currentPrice;
    const expectedDemandChange = priceChangePercent * demandElasticity;
    const expectedQuantityChange = Math.max(0, 1 + expectedDemandChange);
    
    const currentRevenue = context.currentPrice * context.inventoryLevel;
    const projectedRevenue = recommendedPrice * (context.inventoryLevel * expectedQuantityChange);
    
    return projectedRevenue - currentRevenue;
  }

  private calculateDemandElasticity(demandScore: number): number {
    // Higher demand = less elastic (people less sensitive to price changes)
    if (demandScore > 80) return -0.3;
    if (demandScore > 60) return -0.5;
    if (demandScore > 40) return -0.8;
    return -1.2;
  }

  private async savePricingHistory(
    context: PricingContext,
    result: PricingResult,
    calculationTime: number
  ): Promise<void> {
    const history = this.pricingHistoryRepository.create({
      eventId: context.eventId,
      ticketTierId: context.ticketTierId,
      originalPrice: context.currentPrice,
      adjustedPrice: result.recommendedPrice,
      multiplier: result.multiplier,
      adjustmentReason: result.appliedRules.join(', ') || 'No rules applied',
      marketConditions: {
        demandScore: result.factors.demandScore,
        inventoryLevel: result.factors.inventoryLevel,
        competitorAvgPrice: result.factors.competitorPricing,
        timeToEvent: result.factors.timeToEvent,
        seasonalFactor: result.factors.seasonalFactor,
      },
      metadata: {
        appliedRules: result.appliedRules,
        calculationTime,
        confidence: result.confidence,
        expectedRevenue: result.expectedRevenueIncrease,
      },
    });
    
    await this.pricingHistoryRepository.save(history);
  }

  async schedulePriceCalculation(eventId: string, delay: number = 0): Promise<void> {
    await this.pricingQueue.add(
      'calculate-prices',
      { eventId },
      { delay }
    );
  }

  async bulkCalculatePrices(eventIds: string[]): Promise<void> {
    for (const eventId of eventIds) {
      await this.schedulePriceCalculation(eventId, Math.random() * 5000); // Stagger requests
    }
  }
}
