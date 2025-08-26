import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

import { CompetitorPrice } from '../entities/competitor-price.entity';

export interface CompetitorAnalysis {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  competitorCount: number;
  pricePosition: 'below' | 'aligned' | 'above';
  recommendations: string[];
}

@Injectable()
export class CompetitorMonitoringService {
  private readonly logger = new Logger(CompetitorMonitoringService.name);

  constructor(
    @InjectRepository(CompetitorPrice)
    private competitorPriceRepository: Repository<CompetitorPrice>,
    private httpService: HttpService,
  ) {}

  async getAverageCompetitorPrice(eventType: string, location: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.competitorPriceRepository
      .createQueryBuilder('cp')
      .select('AVG(cp.price)', 'avgPrice')
      .where('cp.eventType = :eventType', { eventType })
      .andWhere('cp.location ILIKE :location', { location: `%${location}%` })
      .andWhere('cp.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('cp.confidence >= :minConfidence', { minConfidence: 70 })
      .getRawOne();

    return result?.avgPrice ? parseFloat(result.avgPrice) : 0;
  }

  async analyzeCompetitorPricing(
    eventType: string,
    location: string,
    currentPrice: number,
    eventDate: Date
  ): Promise<CompetitorAnalysis> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get recent competitor prices
      const competitorPrices = await this.competitorPriceRepository.find({
        where: {
          eventType,
          location,
          createdAt: Between(thirtyDaysAgo, new Date()),
          confidence: Between(70, 100),
        },
        order: { createdAt: 'DESC' },
      });

      if (competitorPrices.length === 0) {
        return {
          averagePrice: 0,
          priceRange: { min: 0, max: 0 },
          competitorCount: 0,
          pricePosition: 'aligned',
          recommendations: ['No competitor data available'],
        };
      }

      const prices = competitorPrices.map(cp => parseFloat(cp.price.toString()));
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Determine price position
      let pricePosition: 'below' | 'aligned' | 'above';
      if (currentPrice < averagePrice * 0.9) {
        pricePosition = 'below';
      } else if (currentPrice > averagePrice * 1.1) {
        pricePosition = 'above';
      } else {
        pricePosition = 'aligned';
      }

      // Generate recommendations
      const recommendations = this.generatePricingRecommendations(
        currentPrice,
        averagePrice,
        minPrice,
        maxPrice,
        pricePosition,
        eventDate
      );

      return {
        averagePrice: Math.round(averagePrice * 100) / 100,
        priceRange: {
          min: Math.round(minPrice * 100) / 100,
          max: Math.round(maxPrice * 100) / 100,
        },
        competitorCount: new Set(competitorPrices.map(cp => cp.competitorName)).size,
        pricePosition,
        recommendations,
      };

    } catch (error) {
      this.logger.error(`Error analyzing competitor pricing:`, error);
      return {
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        competitorCount: 0,
        pricePosition: 'aligned',
        recommendations: ['Error analyzing competitor data'],
      };
    }
  }

  private generatePricingRecommendations(
    currentPrice: number,
    averagePrice: number,
    minPrice: number,
    maxPrice: number,
    pricePosition: 'below' | 'aligned' | 'above',
    eventDate: Date
  ): string[] {
    const recommendations: string[] = [];
    const daysToEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    switch (pricePosition) {
      case 'below':
        recommendations.push('Your price is below market average - consider increasing');
        if (currentPrice < minPrice) {
          recommendations.push('You are priced below all competitors - significant upside potential');
        }
        if (daysToEvent > 30) {
          recommendations.push('With time remaining, gradual price increases are recommended');
        }
        break;

      case 'above':
        recommendations.push('Your price is above market average - monitor demand carefully');
        if (currentPrice > maxPrice) {
          recommendations.push('You are the highest priced - ensure value proposition is clear');
        }
        if (daysToEvent < 7) {
          recommendations.push('Close to event date - consider strategic discounting');
        }
        break;

      case 'aligned':
        recommendations.push('Your pricing is well-aligned with market average');
        recommendations.push('Monitor competitor movements for optimization opportunities');
        break;
    }

    // Additional recommendations based on price spread
    const priceSpread = maxPrice - minPrice;
    const spreadPercentage = (priceSpread / averagePrice) * 100;

    if (spreadPercentage > 50) {
      recommendations.push('High price variance in market - differentiation opportunity');
    } else if (spreadPercentage < 20) {
      recommendations.push('Low price variance - competitive market, focus on value-adds');
    }

    return recommendations;
  }

  async recordCompetitorPrice(data: {
    competitorName: string;
    eventName: string;
    eventType: string;
    location: string;
    price: number;
    ticketType: string;
    capacity: number;
    availableTickets: number;
    eventDate: Date;
    sourceUrl: string;
    confidence: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const competitorPrice = this.competitorPriceRepository.create(data);
      await this.competitorPriceRepository.save(competitorPrice);

      this.logger.log(`Recorded competitor price: ${data.competitorName} - $${data.price}`);

    } catch (error) {
      this.logger.error('Error recording competitor price:', error);
    }
  }

  async scrapeCompetitorPrices(eventType: string, location: string): Promise<void> {
    // This is a placeholder for actual web scraping implementation
    // In a real implementation, you would integrate with web scraping services
    // or APIs from competitor platforms
    
    try {
      // Example: Mock data for demonstration
      const mockCompetitorData = [
        {
          competitorName: 'EventBrite',
          eventName: `Sample ${eventType} Event`,
          eventType,
          location,
          price: 45.00 + Math.random() * 20,
          ticketType: 'general',
          capacity: 500,
          availableTickets: Math.floor(Math.random() * 200),
          eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          sourceUrl: 'https://eventbrite.com/sample',
          confidence: 85,
          metadata: {
            scrapingMethod: 'api',
            dataQuality: 'high',
            currency: 'USD',
            priceHistory: [],
          },
        },
        {
          competitorName: 'Ticketmaster',
          eventName: `Another ${eventType} Event`,
          eventType,
          location,
          price: 55.00 + Math.random() * 25,
          ticketType: 'general',
          capacity: 1000,
          availableTickets: Math.floor(Math.random() * 400),
          eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          sourceUrl: 'https://ticketmaster.com/sample',
          confidence: 90,
          metadata: {
            scrapingMethod: 'scraping',
            dataQuality: 'high',
            currency: 'USD',
            priceHistory: [],
          },
        },
      ];

      for (const data of mockCompetitorData) {
        await this.recordCompetitorPrice(data);
      }

      this.logger.log(`Scraped ${mockCompetitorData.length} competitor prices for ${eventType} in ${location}`);

    } catch (error) {
      this.logger.error('Error scraping competitor prices:', error);
    }
  }

  async getCompetitorTrends(
    eventType: string,
    location: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    averagePrice: number;
    competitorCount: number;
    priceRange: { min: number; max: number };
  }>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const prices = await this.competitorPriceRepository.find({
      where: {
        eventType,
        location,
        createdAt: Between(startDate, endDate),
        confidence: Between(70, 100),
      },
      order: { createdAt: 'ASC' },
    });

    // Group by day
    const dailyPrices = new Map<string, CompetitorPrice[]>();
    
    for (const price of prices) {
      const dateKey = price.createdAt.toISOString().split('T')[0];
      if (!dailyPrices.has(dateKey)) {
        dailyPrices.set(dateKey, []);
      }
      dailyPrices.get(dateKey)!.push(price);
    }

    // Calculate daily statistics
    const trends = [];
    for (const [date, dayPrices] of dailyPrices.entries()) {
      const priceValues = dayPrices.map(p => parseFloat(p.price.toString()));
      const averagePrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
      const competitorCount = new Set(dayPrices.map(p => p.competitorName)).size;
      
      trends.push({
        date,
        averagePrice: Math.round(averagePrice * 100) / 100,
        competitorCount,
        priceRange: {
          min: Math.min(...priceValues),
          max: Math.max(...priceValues),
        },
      });
    }

    return trends;
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledCompetitorScraping(): Promise<void> {
    try {
      // Get active event types and locations for scraping
      const activeEvents = await this.getActiveEventTypesAndLocations();
      
      for (const { eventType, location } of activeEvents) {
        await this.scrapeCompetitorPrices(eventType, location);
        // Add delay to avoid overwhelming external services
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      this.logger.log('Completed scheduled competitor price scraping');

    } catch (error) {
      this.logger.error('Error in scheduled competitor scraping:', error);
    }
  }

  private async getActiveEventTypesAndLocations(): Promise<Array<{
    eventType: string;
    location: string;
  }>> {
    // This would typically query your events database to get active events
    // For now, returning common event types and locations
    return [
      { eventType: 'concert', location: 'New York' },
      { eventType: 'conference', location: 'San Francisco' },
      { eventType: 'sports', location: 'Los Angeles' },
      { eventType: 'theater', location: 'Chicago' },
    ];
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldCompetitorData(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.competitorPriceRepository.delete({
        createdAt: Between(new Date('1970-01-01'), ninetyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old competitor price records`);
      }

    } catch (error) {
      this.logger.error('Error cleaning up old competitor data:', error);
    }
  }

  async getCompetitorInsights(eventType: string, location: string): Promise<{
    marketLeader: string;
    averagePriceChange: number;
    priceVolatility: number;
    recommendations: string[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPrices = await this.competitorPriceRepository.find({
      where: {
        eventType,
        location,
        createdAt: Between(thirtyDaysAgo, new Date()),
      },
      order: { createdAt: 'ASC' },
    });

    if (recentPrices.length === 0) {
      return {
        marketLeader: 'Unknown',
        averagePriceChange: 0,
        priceVolatility: 0,
        recommendations: ['Insufficient data for insights'],
      };
    }

    // Find market leader (most frequent competitor)
    const competitorCounts = new Map<string, number>();
    recentPrices.forEach(price => {
      competitorCounts.set(
        price.competitorName,
        (competitorCounts.get(price.competitorName) || 0) + 1
      );
    });

    const marketLeader = Array.from(competitorCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

    // Calculate average price change
    const firstWeekPrices = recentPrices.filter(p => 
      p.createdAt <= new Date(thirtyDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
    const lastWeekPrices = recentPrices.filter(p => 
      p.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    let averagePriceChange = 0;
    if (firstWeekPrices.length > 0 && lastWeekPrices.length > 0) {
      const firstWeekAvg = firstWeekPrices.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0) / firstWeekPrices.length;
      const lastWeekAvg = lastWeekPrices.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0) / lastWeekPrices.length;
      averagePriceChange = ((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;
    }

    // Calculate price volatility (standard deviation)
    const allPrices = recentPrices.map(p => parseFloat(p.price.toString()));
    const avgPrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    const variance = allPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / allPrices.length;
    const priceVolatility = Math.sqrt(variance);

    // Generate insights-based recommendations
    const recommendations: string[] = [];
    
    if (Math.abs(averagePriceChange) > 5) {
      recommendations.push(`Market prices are ${averagePriceChange > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(averagePriceChange).toFixed(1)}%`);
    }
    
    if (priceVolatility > avgPrice * 0.2) {
      recommendations.push('High price volatility detected - monitor competitor moves closely');
    }
    
    recommendations.push(`${marketLeader} appears to be the market leader in this segment`);

    return {
      marketLeader,
      averagePriceChange: Math.round(averagePriceChange * 100) / 100,
      priceVolatility: Math.round(priceVolatility * 100) / 100,
      recommendations,
    };
  }
}
