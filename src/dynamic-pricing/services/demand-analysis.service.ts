import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DemandMetric } from '../entities/demand-metric.entity';

export interface DemandAnalysisResult {
  demandScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  velocity: number;
  confidence: number;
  factors: {
    pageViews: number;
    ticketViews: number;
    cartAdditions: number;
    searchQueries: number;
    socialMentions: number;
  };
}

@Injectable()
export class DemandAnalysisService {
  private readonly logger = new Logger(DemandAnalysisService.name);

  constructor(
    @InjectRepository(DemandMetric)
    private demandMetricRepository: Repository<DemandMetric>,
  ) {}

  async calculateDemandScore(eventId: string): Promise<number> {
    const analysis = await this.analyzeDemand(eventId);
    return analysis.demandScore;
  }

  async analyzeDemand(eventId: string): Promise<DemandAnalysisResult> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get recent metrics
      const recentMetrics = await this.demandMetricRepository.find({
        where: {
          eventId,
          createdAt: Between(oneDayAgo, now),
        },
        order: { createdAt: 'DESC' },
      });

      // Get previous period metrics for trend analysis
      const previousMetrics = await this.demandMetricRepository.find({
        where: {
          eventId,
          createdAt: Between(twoDaysAgo, oneDayAgo),
        },
        order: { createdAt: 'DESC' },
      });

      // Aggregate metrics by type
      const factors = this.aggregateMetrics(recentMetrics);
      const previousFactors = this.aggregateMetrics(previousMetrics);

      // Calculate weighted demand score
      const demandScore = this.calculateWeightedDemandScore(factors);

      // Determine trend
      const trend = this.calculateTrend(factors, previousFactors);

      // Calculate velocity (rate of change)
      const velocity = this.calculateVelocity(factors, previousFactors);

      // Calculate confidence based on data availability
      const confidence = this.calculateAnalysisConfidence(recentMetrics.length, factors);

      return {
        demandScore,
        trend,
        velocity,
        confidence,
        factors,
      };

    } catch (error) {
      this.logger.error(`Error analyzing demand for event ${eventId}:`, error);
      return {
        demandScore: 50, // Default neutral score
        trend: 'stable',
        velocity: 0,
        confidence: 0,
        factors: {
          pageViews: 0,
          ticketViews: 0,
          cartAdditions: 0,
          searchQueries: 0,
          socialMentions: 0,
        },
      };
    }
  }

  private aggregateMetrics(metrics: DemandMetric[]): {
    pageViews: number;
    ticketViews: number;
    cartAdditions: number;
    searchQueries: number;
    socialMentions: number;
  } {
    const aggregated = {
      pageViews: 0,
      ticketViews: 0,
      cartAdditions: 0,
      searchQueries: 0,
      socialMentions: 0,
    };

    for (const metric of metrics) {
      switch (metric.metricType) {
        case 'page_views':
          aggregated.pageViews += metric.count;
          break;
        case 'ticket_views':
          aggregated.ticketViews += metric.count;
          break;
        case 'cart_additions':
          aggregated.cartAdditions += metric.count;
          break;
        case 'search_queries':
          aggregated.searchQueries += metric.count;
          break;
        case 'social_mentions':
          aggregated.socialMentions += metric.count;
          break;
      }
    }

    return aggregated;
  }

  private calculateWeightedDemandScore(factors: {
    pageViews: number;
    ticketViews: number;
    cartAdditions: number;
    searchQueries: number;
    socialMentions: number;
  }): number {
    // Weights for different factors (higher weight = more important)
    const weights = {
      pageViews: 0.15,
      ticketViews: 0.25,
      cartAdditions: 0.35,
      searchQueries: 0.15,
      socialMentions: 0.10,
    };

    // Normalize factors to 0-100 scale
    const normalizedFactors = {
      pageViews: Math.min(factors.pageViews / 100, 100),
      ticketViews: Math.min(factors.ticketViews / 50, 100),
      cartAdditions: Math.min(factors.cartAdditions / 20, 100),
      searchQueries: Math.min(factors.searchQueries / 30, 100),
      socialMentions: Math.min(factors.socialMentions / 10, 100),
    };

    // Calculate weighted score
    let weightedScore = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      weightedScore += normalizedFactors[factor] * weight;
    }

    return Math.round(Math.min(weightedScore, 100));
  }

  private calculateTrend(
    current: any,
    previous: any
  ): 'increasing' | 'decreasing' | 'stable' {
    const currentTotal = Object.values(current).reduce((sum: number, val: number) => sum + val, 0);
    const previousTotal = Object.values(previous).reduce((sum: number, val: number) => sum + val, 0);

    if (previousTotal === 0) return 'stable';

    const changePercent = ((currentTotal - previousTotal) / previousTotal) * 100;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  private calculateVelocity(current: any, previous: any): number {
    const currentTotal = Object.values(current).reduce((sum: number, val: number) => sum + val, 0);
    const previousTotal = Object.values(previous).reduce((sum: number, val: number) => sum + val, 0);

    if (previousTotal === 0) return 0;

    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }

  private calculateAnalysisConfidence(dataPoints: number, factors: any): number {
    let confidence = 0;

    // Base confidence from data availability
    confidence += Math.min(dataPoints * 2, 40);

    // Bonus for having diverse data sources
    const activeFactors = Object.values(factors).filter((val: number) => val > 0).length;
    confidence += activeFactors * 10;

    // Bonus for high-value interactions
    if (factors.cartAdditions > 0) confidence += 20;
    if (factors.ticketViews > 10) confidence += 10;

    return Math.min(confidence, 95);
  }

  async recordDemandMetric(
    eventId: string,
    metricType: string,
    value: number,
    count: number = 1,
    timeWindow: string = '1h',
    metadata?: any
  ): Promise<void> {
    try {
      // Calculate demand score for this metric
      const demandScore = this.calculateMetricDemandScore(metricType, value, count);

      const metric = this.demandMetricRepository.create({
        eventId,
        metricType,
        value,
        count,
        timeWindow,
        demandScore,
        metadata,
      });

      await this.demandMetricRepository.save(metric);

    } catch (error) {
      this.logger.error(`Error recording demand metric:`, error);
    }
  }

  private calculateMetricDemandScore(metricType: string, value: number, count: number): number {
    // Different scoring algorithms based on metric type
    switch (metricType) {
      case 'page_views':
        return Math.min(count * 0.5, 100);
      case 'ticket_views':
        return Math.min(count * 1.0, 100);
      case 'cart_additions':
        return Math.min(count * 5.0, 100);
      case 'purchases':
        return Math.min(count * 10.0, 100);
      case 'search_queries':
        return Math.min(count * 2.0, 100);
      case 'social_mentions':
        return Math.min(count * 3.0, 100);
      default:
        return Math.min(count * 1.0, 100);
    }
  }

  async getDemandTrends(eventId: string, days: number = 7): Promise<Array<{
    date: string;
    demandScore: number;
    metrics: any;
  }>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.demandMetricRepository.find({
      where: {
        eventId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Group metrics by day
    const dailyMetrics = new Map<string, DemandMetric[]>();
    
    for (const metric of metrics) {
      const dateKey = metric.createdAt.toISOString().split('T')[0];
      if (!dailyMetrics.has(dateKey)) {
        dailyMetrics.set(dateKey, []);
      }
      dailyMetrics.get(dateKey)!.push(metric);
    }

    // Calculate daily demand scores
    const trends = [];
    for (const [date, dayMetrics] of dailyMetrics.entries()) {
      const factors = this.aggregateMetrics(dayMetrics);
      const demandScore = this.calculateWeightedDemandScore(factors);
      
      trends.push({
        date,
        demandScore,
        metrics: factors,
      });
    }

    return trends;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.demandMetricRepository.delete({
        createdAt: Between(new Date('1970-01-01'), thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old demand metrics`);
      }

    } catch (error) {
      this.logger.error('Error cleaning up old demand metrics:', error);
    }
  }

  async getTopDemandEvents(limit: number = 10): Promise<Array<{
    eventId: string;
    demandScore: number;
    trend: string;
  }>> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentMetrics = await this.demandMetricRepository
      .createQueryBuilder('metric')
      .select('metric.eventId')
      .addSelect('AVG(metric.demandScore)', 'avgDemandScore')
      .addSelect('COUNT(*)', 'metricCount')
      .where('metric.createdAt >= :oneDayAgo', { oneDayAgo })
      .groupBy('metric.eventId')
      .orderBy('avgDemandScore', 'DESC')
      .limit(limit)
      .getRawMany();

    const results = [];
    for (const metric of recentMetrics) {
      const analysis = await this.analyzeDemand(metric.eventId);
      results.push({
        eventId: metric.eventId,
        demandScore: Math.round(parseFloat(metric.avgDemandScore)),
        trend: analysis.trend,
      });
    }

    return results;
  }
}
