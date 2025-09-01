import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RecommendationAnalytics, MetricType } from '../entities/recommendation-analytics.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { UserInteraction } from '../entities/user-interaction.entity';
import { RecommendationModel } from '../entities/recommendation-model.entity';

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface PerformanceMetrics {
  totalRecommendations: number;
  uniqueUsers: number;
  clickThroughRate: number;
  conversionRate: number;
  averageScore: number;
  revenueGenerated: number;
  topCategories: Array<{ category: string; count: number; ctr: number }>;
  algorithmBreakdown: Record<string, {
    recommendations: number;
    clicks: number;
    conversions: number;
    revenue: number;
    averageScore: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    recommendations: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

@Injectable()
export class RecommendationAnalyticsService {
  constructor(
    @InjectRepository(RecommendationAnalytics)
    private analyticsRepository: Repository<RecommendationAnalytics>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(RecommendationModel)
    private modelRepository: Repository<RecommendationModel>,
  ) {}

  async recordMetric(
    modelId: string,
    metricType: MetricType,
    value: number,
    segmentBy?: string,
    abTestGroup?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const analytics = this.analyticsRepository.create({
      modelId,
      metricType,
      value,
      date: new Date(),
      segmentBy,
      abTestGroup,
      metadata,
    });

    await this.analyticsRepository.save(analytics);
  }

  async getPerformanceMetrics(
    dateRange: AnalyticsDateRange,
    modelId?: string,
  ): Promise<PerformanceMetrics> {
    const whereClause: any = {
      date: Between(dateRange.start, dateRange.end),
    };

    if (modelId) {
      whereClause.modelId = modelId;
    }

    // Get all analytics data for the period
    const analytics = await this.analyticsRepository.find({
      where: whereClause,
      order: { date: 'ASC' },
    });

    // Get recommendations for the period
    const recommendations = await this.recommendationRepository.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
      },
      relations: ['user', 'event'],
    });

    // Get interactions for the period
    const interactions = await this.interactionRepository.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    return this.calculateMetrics(analytics, recommendations, interactions);
  }

  private calculateMetrics(
    analytics: RecommendationAnalytics[],
    recommendations: Recommendation[],
    interactions: UserInteraction[],
  ): PerformanceMetrics {
    const totalRecommendations = recommendations.length;
    const uniqueUsers = new Set(recommendations.map(r => r.userId)).size;
    
    // Calculate click-through rate
    const clicks = interactions.filter(i => 
      i.interactionType === 'click' && 
      i.metadata?.recommendationId
    ).length;
    const clickThroughRate = totalRecommendations > 0 ? clicks / totalRecommendations : 0;

    // Calculate conversion rate
    const conversions = interactions.filter(i => 
      i.interactionType === 'purchase' && 
      i.metadata?.recommendationId
    ).length;
    const conversionRate = totalRecommendations > 0 ? conversions / totalRecommendations : 0;

    // Calculate average score
    const averageScore = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length 
      : 0;

    // Calculate revenue (mock calculation)
    const revenueGenerated = analytics
      .filter(a => a.metricType === MetricType.REVENUE)
      .reduce((sum, a) => sum + a.value, 0);

    // Top categories analysis
    const categoryStats = new Map<string, { count: number; clicks: number }>();
    
    recommendations.forEach(r => {
      const category = r.event?.category || 'Unknown';
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { count: 0, clicks: 0 });
      }
      categoryStats.get(category)!.count++;
    });

    interactions
      .filter(i => i.interactionType === 'click' && i.metadata?.recommendationId)
      .forEach(i => {
        const rec = recommendations.find(r => r.id === i.metadata?.recommendationId);
        if (rec?.event?.category) {
          const stats = categoryStats.get(rec.event.category);
          if (stats) {
            stats.clicks++;
          }
        }
      });

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        ctr: stats.count > 0 ? stats.clicks / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Algorithm breakdown
    const algorithmStats = new Map<string, any>();
    
    recommendations.forEach(r => {
      const algorithm = r.reasons?.[0] || 'unknown';
      if (!algorithmStats.has(algorithm)) {
        algorithmStats.set(algorithm, {
          recommendations: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          totalScore: 0,
        });
      }
      const stats = algorithmStats.get(algorithm)!;
      stats.recommendations++;
      stats.totalScore += r.score;
    });

    interactions
      .filter(i => i.metadata?.recommendationId)
      .forEach(i => {
        const rec = recommendations.find(r => r.id === i.metadata?.recommendationId);
        if (rec) {
          const algorithm = rec.reasons?.[0] || 'unknown';
          const stats = algorithmStats.get(algorithm);
          if (stats) {
            if (i.interactionType === 'click') {
              stats.clicks++;
            } else if (i.interactionType === 'purchase') {
              stats.conversions++;
              stats.revenue += i.metadata?.revenue || 0;
            }
          }
        }
      });

    const algorithmBreakdown = Object.fromEntries(
      Array.from(algorithmStats.entries()).map(([algorithm, stats]) => [
        algorithm,
        {
          recommendations: stats.recommendations,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          averageScore: stats.recommendations > 0 ? stats.totalScore / stats.recommendations : 0,
        },
      ])
    );

    // Time series data (daily aggregation)
    const timeSeriesMap = new Map<string, any>();
    
    recommendations.forEach(r => {
      const date = r.createdAt.toISOString().split('T')[0];
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {
          date,
          recommendations: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        });
      }
      timeSeriesMap.get(date)!.recommendations++;
    });

    interactions
      .filter(i => i.metadata?.recommendationId)
      .forEach(i => {
        const date = i.createdAt.toISOString().split('T')[0];
        const dayStats = timeSeriesMap.get(date);
        if (dayStats) {
          if (i.interactionType === 'click') {
            dayStats.clicks++;
          } else if (i.interactionType === 'purchase') {
            dayStats.conversions++;
            dayStats.revenue += i.metadata?.revenue || 0;
          }
        }
      });

    const timeSeriesData = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRecommendations,
      uniqueUsers,
      clickThroughRate,
      conversionRate,
      averageScore,
      revenueGenerated,
      topCategories,
      algorithmBreakdown,
      timeSeriesData,
    };
  }

  async getModelPerformanceComparison(
    dateRange: AnalyticsDateRange,
  ): Promise<Record<string, PerformanceMetrics>> {
    const models = await this.modelRepository.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const comparison: Record<string, PerformanceMetrics> = {};

    for (const model of models) {
      comparison[model.id] = await this.getPerformanceMetrics(dateRange, model.id);
    }

    return comparison;
  }

  async getRealtimeMetrics(): Promise<any> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    return this.getPerformanceMetrics({ start: last24Hours, end: now });
  }

  async getUserSegmentAnalysis(
    dateRange: AnalyticsDateRange,
  ): Promise<Record<string, any>> {
    const analytics = await this.analyticsRepository.find({
      where: {
        date: Between(dateRange.start, dateRange.end),
      },
    });

    // Group by segment
    const segments = new Map<string, any>();
    
    analytics.forEach(a => {
      const segment = a.segmentBy || 'default';
      if (!segments.has(segment)) {
        segments.set(segment, {
          segment,
          totalMetrics: 0,
          averageValue: 0,
          metricTypes: new Set(),
        });
      }
      
      const segmentData = segments.get(segment)!;
      segmentData.totalMetrics++;
      segmentData.averageValue += a.value;
      segmentData.metricTypes.add(a.metricType);
    });

    // Calculate averages
    segments.forEach(segmentData => {
      segmentData.averageValue = segmentData.totalMetrics > 0 
        ? segmentData.averageValue / segmentData.totalMetrics 
        : 0;
      segmentData.metricTypes = Array.from(segmentData.metricTypes);
    });

    return Object.fromEntries(segments);
  }

  async getABTestAnalytics(
    experimentId: string,
    dateRange: AnalyticsDateRange,
  ): Promise<Record<string, any>> {
    const analytics = await this.analyticsRepository.find({
      where: {
        modelId: experimentId,
        date: Between(dateRange.start, dateRange.end),
      },
    });

    // Group by A/B test group
    const groups = new Map<string, any>();
    
    analytics.forEach(a => {
      const group = a.abTestGroup || 'control';
      if (!groups.has(group)) {
        groups.set(group, {
          group,
          metrics: new Map<MetricType, number[]>(),
        });
      }
      
      const groupData = groups.get(group)!;
      if (!groupData.metrics.has(a.metricType)) {
        groupData.metrics.set(a.metricType, []);
      }
      groupData.metrics.get(a.metricType)!.push(a.value);
    });

    // Calculate statistics for each group
    const results = Object.fromEntries(
      Array.from(groups.entries()).map(([group, data]) => [
        group,
        {
          group,
          metrics: Object.fromEntries(
            Array.from(data.metrics.entries()).map(([metricType, values]) => [
              metricType,
              {
                count: values.length,
                average: values.reduce((sum, v) => sum + v, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                sum: values.reduce((sum, v) => sum + v, 0),
              },
            ])
          ),
        },
      ])
    );

    return results;
  }

  async generateDailyReport(date: Date = new Date()): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await this.getPerformanceMetrics({
      start: startOfDay,
      end: endOfDay,
    });

    return {
      date: date.toISOString().split('T')[0],
      summary: {
        totalRecommendations: metrics.totalRecommendations,
        uniqueUsers: metrics.uniqueUsers,
        clickThroughRate: metrics.clickThroughRate,
        conversionRate: metrics.conversionRate,
        revenueGenerated: metrics.revenueGenerated,
      },
      topPerformingCategories: metrics.topCategories.slice(0, 5),
      algorithmPerformance: metrics.algorithmBreakdown,
      trends: {
        recommendationsVsPreviousDay: 0, // Would calculate with previous day data
        ctrVsPreviousDay: 0,
        conversionVsPreviousDay: 0,
      },
    };
  }

  async getSystemHealth(): Promise<any> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const recentMetrics = await this.getPerformanceMetrics({
      start: last24Hours,
      end: now,
    });

    const activeModels = await this.modelRepository.count({
      where: { status: 'active' },
    });

    const recentErrors = await this.analyticsRepository.count({
      where: {
        metricType: MetricType.ERROR_RATE,
        date: Between(last24Hours, now),
      },
    });

    return {
      status: recentErrors < 10 ? 'healthy' : 'warning',
      activeModels,
      last24Hours: {
        recommendations: recentMetrics.totalRecommendations,
        clickThroughRate: recentMetrics.clickThroughRate,
        conversionRate: recentMetrics.conversionRate,
        errors: recentErrors,
      },
      systemLoad: {
        recommendationsPerHour: Math.round(recentMetrics.totalRecommendations / 24),
        averageResponseTime: 150, // Mock value
        memoryUsage: 65, // Mock percentage
      },
    };
  }

  async getTopPerformingEvents(
    dateRange: AnalyticsDateRange,
    limit: number = 10,
  ): Promise<Array<any>> {
    const interactions = await this.interactionRepository.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
        interactionType: 'click',
      },
    });

    // Group by event ID
    const eventStats = new Map<string, { clicks: number; conversions: number; revenue: number }>();
    
    interactions.forEach(i => {
      if (!eventStats.has(i.eventId)) {
        eventStats.set(i.eventId, { clicks: 0, conversions: 0, revenue: 0 });
      }
      
      const stats = eventStats.get(i.eventId)!;
      if (i.interactionType === 'click') {
        stats.clicks++;
      } else if (i.interactionType === 'purchase') {
        stats.conversions++;
        stats.revenue += i.metadata?.revenue || 0;
      }
    });

    return Array.from(eventStats.entries())
      .map(([eventId, stats]) => ({
        eventId,
        ...stats,
        conversionRate: stats.clicks > 0 ? stats.conversions / stats.clicks : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  async exportAnalyticsData(
    dateRange: AnalyticsDateRange,
    format: 'json' | 'csv' = 'json',
  ): Promise<any> {
    const analytics = await this.analyticsRepository.find({
      where: {
        date: Between(dateRange.start, dateRange.end),
      },
      order: { date: 'ASC' },
    });

    if (format === 'csv') {
      const headers = ['Date', 'Model ID', 'Metric Type', 'Value', 'Segment', 'AB Test Group'];
      const rows = analytics.map(a => [
        a.date.toISOString(),
        a.modelId,
        a.metricType,
        a.value,
        a.segmentBy || '',
        a.abTestGroup || '',
      ]);

      return {
        headers,
        rows,
        csv: [headers, ...rows].map(row => row.join(',')).join('\n'),
      };
    }

    return analytics;
  }

  async schedulePerformanceReport(): Promise<void> {
    // This would typically be called by a cron job
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const report = await this.generateDailyReport(yesterday);
    
    // Store the report or send via email/notification
    await this.recordMetric(
      'system',
      MetricType.SYSTEM_PERFORMANCE,
      report.summary.clickThroughRate,
      'daily_report',
      undefined,
      report,
    );
  }
}
