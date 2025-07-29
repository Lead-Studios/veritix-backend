import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTier } from '../entities/ticket-tier.entity';
import { TicketHistory } from '../../ticket/entities/ticket-history.entity';
import { 
  PricingStrategy, 
  PricingStrategyConfig, 
  DynamicPriceResult,
  PriceThreshold 
} from '../enums/pricing-strategy.enum';

@Injectable()
export class PricingStrategyService {
  constructor(
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepo: Repository<TicketHistory>,
  ) {}

  /**
   * Calculate dynamic price based on demand and pricing strategy
   */
  async calculateDynamicPrice(
    ticketTier: TicketTier,
    config: PricingStrategyConfig,
  ): Promise<DynamicPriceResult> {
    const soldCount = await this.getSoldCount(ticketTier);
    const totalQuantity = ticketTier.quantity;
    const soldPercentage = totalQuantity > 0 ? (soldCount / totalQuantity) * 100 : 0;
    const originalPrice = ticketTier.price;

    let currentPrice: number;

    switch (config.strategy) {
      case PricingStrategy.FIXED:
        currentPrice = originalPrice;
        break;
      
      case PricingStrategy.LINEAR:
        currentPrice = this.calculateLinearPrice(originalPrice, soldPercentage, config);
        break;
      
      case PricingStrategy.THRESHOLD:
        currentPrice = this.calculateThresholdPrice(originalPrice, soldPercentage, config);
        break;
      
      case PricingStrategy.EXPONENTIAL:
        currentPrice = this.calculateExponentialPrice(originalPrice, soldPercentage, config);
        break;
      
      default:
        currentPrice = originalPrice;
    }

    // Apply min/max price constraints
    if (config.minPrice && currentPrice < config.minPrice) {
      currentPrice = config.minPrice;
    }
    if (config.maxPrice && currentPrice > config.maxPrice) {
      currentPrice = config.maxPrice;
    }

    return {
      currentPrice: Math.round(currentPrice * 100) / 100, // Round to 2 decimal places
      originalPrice,
      strategy: config.strategy,
      soldCount,
      totalQuantity,
      soldPercentage: Math.round(soldPercentage * 100) / 100,
    };
  }

  /**
   * Get the number of tickets sold for a specific tier
   * Since tickets are not directly linked to tiers, we estimate based on price matching
   */
  private async getSoldCount(ticketTier: TicketTier): Promise<number> {
    // For now, we'll use a simple approach: count tickets sold for this event
    // that match the tier's price range (within 5% tolerance)
    const priceTolerance = 0.05; // 5% tolerance
    const minPrice = ticketTier.price * (1 - priceTolerance);
    const maxPrice = ticketTier.price * (1 + priceTolerance);

    const result = await this.ticketHistoryRepo
      .createQueryBuilder('th')
      .leftJoin('th.ticket', 'ticket')
      .where('ticket.eventId = :eventId', { eventId: ticketTier.eventId })
      .andWhere('th.amount >= :minPrice', { minPrice })
      .andWhere('th.amount <= :maxPrice', { maxPrice })
      .getCount();
    
    return result;
  }

  /**
   * Calculate linear price increase based on demand
   */
  private calculateLinearPrice(
    basePrice: number,
    soldPercentage: number,
    config: PricingStrategyConfig,
  ): number {
    const multiplier = config.demandMultiplier || 1.5;
    const increaseFactor = (soldPercentage / 100) * (multiplier - 1);
    return basePrice * (1 + increaseFactor);
  }

  /**
   * Calculate threshold-based price increases
   */
  private calculateThresholdPrice(
    basePrice: number,
    soldPercentage: number,
    config: PricingStrategyConfig,
  ): number {
    if (!config.thresholds || config.thresholds.length === 0) {
      return basePrice;
    }

    // Sort thresholds by soldPercentage in descending order
    const sortedThresholds = [...config.thresholds].sort(
      (a, b) => b.soldPercentage - a.soldPercentage
    );

    // Find the applicable threshold
    const applicableThreshold = sortedThresholds.find(
      threshold => soldPercentage >= threshold.soldPercentage
    );

    if (applicableThreshold) {
      return basePrice * applicableThreshold.priceMultiplier;
    }

    return basePrice;
  }

  /**
   * Calculate exponential price increase based on demand
   */
  private calculateExponentialPrice(
    basePrice: number,
    soldPercentage: number,
    config: PricingStrategyConfig,
  ): number {
    const multiplier = config.demandMultiplier || 2;
    const exponent = soldPercentage / 100;
    return basePrice * Math.pow(multiplier, exponent);
  }

  /**
   * Get default pricing strategy configuration
   */
  getDefaultConfig(strategy: PricingStrategy): PricingStrategyConfig {
    switch (strategy) {
      case PricingStrategy.LINEAR:
        return {
          strategy,
          basePrice: 0,
          demandMultiplier: 1.5,
          maxPrice: undefined,
          minPrice: undefined,
        };
      
      case PricingStrategy.THRESHOLD:
        return {
          strategy,
          basePrice: 0,
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
            { soldPercentage: 75, priceMultiplier: 1.5 },
            { soldPercentage: 90, priceMultiplier: 2.0 },
          ],
        };
      
      case PricingStrategy.EXPONENTIAL:
        return {
          strategy,
          basePrice: 0,
          demandMultiplier: 2,
          maxPrice: undefined,
          minPrice: undefined,
        };
      
      default:
        return {
          strategy: PricingStrategy.FIXED,
          basePrice: 0,
        };
    }
  }
} 