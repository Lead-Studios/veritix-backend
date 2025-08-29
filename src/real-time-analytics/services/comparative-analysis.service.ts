import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventAnalytics } from '../entities/event-analytics.entity';

export interface BenchmarkData {
  eventType: string;
  venueCapacity: number;
  ticketPriceRange: { min: number; max: number };
  averageRevenue: number;
  averageAttendance: number;
  conversionRate: number;
  salesVelocity: number;
  marketingSpend: number;
  socialMediaReach: number;
  customerSatisfaction: number;
}

export interface CompetitorEvent {
  eventId: string;
  eventName: string;
  organizerId: string;
  eventType: string;
  venueCapacity: number;
  ticketsSold: number;
  totalRevenue: number;
  averageTicketPrice: number;
  marketingSpend: number;
  socialMediaReach: number;
  sentimentScore: number;
  eventDate: Date;
  location: string;
}

export interface PerformanceMetrics {
  revenuePerAttendee: number;
  capacityUtilization: number;
  conversionRate: number;
  salesVelocity: number;
  marketingROI: number;
  socialMediaEngagement: number;
  customerSatisfactionScore: number;
  netPromoterScore: number;
}

export interface ComparisonResult {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  percentageDifference: number;
  performance: 'above' | 'at' | 'below';
  ranking: number;
  totalComparisons: number;
}

@Injectable()
export class ComparativeAnalysisService {
  private readonly logger = new Logger(ComparativeAnalysisService.name);

  constructor(
    @InjectRepository(EventAnalytics)
    private eventAnalyticsRepository: Repository<EventAnalytics>,
    private eventEmitter: EventEmitter2,
  ) {}

  async performComparativeAnalysis(
    eventId: string,
    organizerId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Performing comparative analysis for event ${eventId}`);

      const currentEvent = await this.getCurrentEventData(eventId);
      const similarEvents = await this.findSimilarEvents(currentEvent);
      const industryBenchmarks = await this.getIndustryBenchmarks(currentEvent.eventType);
      const competitorEvents = await this.getCompetitorEvents(currentEvent);
      
      const performanceMetrics = this.calculatePerformanceMetrics(currentEvent);
      const benchmarkComparisons = this.compareToBenchmarks(performanceMetrics, industryBenchmarks);
      const competitorComparisons = this.compareToCompetitors(performanceMetrics, competitorEvents);
      const historicalComparisons = await this.compareToHistorical(organizerId, currentEvent);
      
      const insights = this.generateInsights(benchmarkComparisons, competitorComparisons, historicalComparisons);
      const recommendations = this.generateRecommendations(insights, performanceMetrics);

      const analysis = {
        eventId,
        organizerId,
        analysisDate: new Date(),
        currentMetrics: performanceMetrics,
        benchmarkComparisons,
        competitorComparisons,
        historicalComparisons,
        insights,
        recommendations,
        overallPerformanceScore: this.calculateOverallScore(benchmarkComparisons),
        marketPosition: this.determineMarketPosition(competitorComparisons),
      };

      // Update event analytics with comparative data
      await this.updateEventAnalytics(eventId, analysis);

      // Emit comparative analysis event
      this.eventEmitter.emit('analytics.comparative.updated', {
        eventId,
        organizerId,
        analysis,
        timestamp: new Date(),
      });

      return analysis;

    } catch (error) {
      this.logger.error(`Error performing comparative analysis: ${error.message}`);
      throw error;
    }
  }

  private async getCurrentEventData(eventId: string) {
    const analytics = await this.eventAnalyticsRepository.findOne({
      where: { eventId },
    });

    if (!analytics) {
      throw new Error(`Event analytics not found for event ${eventId}`);
    }

    return {
      eventId,
      eventType: analytics.eventType || 'general',
      venueCapacity: analytics.venueCapacity || 1000,
      ticketsSold: analytics.ticketSalesMetrics?.totalTicketsSold || 0,
      totalRevenue: analytics.ticketSalesMetrics?.totalRevenue || 0,
      averageTicketPrice: analytics.ticketSalesMetrics?.averageTicketPrice || 0,
      conversionRate: analytics.ticketSalesMetrics?.conversionRate || 0,
      salesVelocity: analytics.ticketSalesMetrics?.salesVelocity || 0,
      marketingSpend: analytics.customMetrics?.marketingSpend || 0,
      socialMediaReach: analytics.socialMediaMetrics?.totalReach || 0,
      sentimentScore: analytics.socialMediaMetrics?.overallSentiment || 0,
      eventDate: analytics.eventDate,
      location: analytics.location || 'Unknown',
    };
  }

  private async findSimilarEvents(currentEvent: any): Promise<CompetitorEvent[]> {
    // Find events with similar characteristics
    const similarEvents = await this.eventAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.eventType = :eventType', { eventType: currentEvent.eventType })
      .andWhere('analytics.venueCapacity BETWEEN :minCapacity AND :maxCapacity', {
        minCapacity: currentEvent.venueCapacity * 0.7,
        maxCapacity: currentEvent.venueCapacity * 1.3,
      })
      .andWhere('analytics.eventId != :eventId', { eventId: currentEvent.eventId })
      .orderBy('analytics.updatedAt', 'DESC')
      .limit(20)
      .getMany();

    return similarEvents.map(event => ({
      eventId: event.eventId,
      eventName: event.eventName || 'Unknown Event',
      organizerId: event.organizerId,
      eventType: event.eventType || 'general',
      venueCapacity: event.venueCapacity || 1000,
      ticketsSold: event.ticketSalesMetrics?.totalTicketsSold || 0,
      totalRevenue: event.ticketSalesMetrics?.totalRevenue || 0,
      averageTicketPrice: event.ticketSalesMetrics?.averageTicketPrice || 0,
      marketingSpend: event.customMetrics?.marketingSpend || 0,
      socialMediaReach: event.socialMediaMetrics?.totalReach || 0,
      sentimentScore: event.socialMediaMetrics?.overallSentiment || 0,
      eventDate: event.eventDate,
      location: event.location || 'Unknown',
    }));
  }

  private async getIndustryBenchmarks(eventType: string): Promise<BenchmarkData> {
    // Industry benchmark data (would typically come from external data sources)
    const benchmarks = {
      'concert': {
        eventType: 'concert',
        venueCapacity: 5000,
        ticketPriceRange: { min: 50, max: 200 },
        averageRevenue: 400000,
        averageAttendance: 4200,
        conversionRate: 0.15,
        salesVelocity: 150,
        marketingSpend: 50000,
        socialMediaReach: 100000,
        customerSatisfaction: 8.2,
      },
      'conference': {
        eventType: 'conference',
        venueCapacity: 1000,
        ticketPriceRange: { min: 200, max: 800 },
        averageRevenue: 350000,
        averageAttendance: 850,
        conversionRate: 0.12,
        salesVelocity: 80,
        marketingSpend: 40000,
        socialMediaReach: 50000,
        customerSatisfaction: 7.8,
      },
      'general': {
        eventType: 'general',
        venueCapacity: 2000,
        ticketPriceRange: { min: 30, max: 150 },
        averageRevenue: 180000,
        averageAttendance: 1600,
        conversionRate: 0.10,
        salesVelocity: 100,
        marketingSpend: 25000,
        socialMediaReach: 75000,
        customerSatisfaction: 7.5,
      },
    };

    return benchmarks[eventType] || benchmarks['general'];
  }

  private async getCompetitorEvents(currentEvent: any): Promise<CompetitorEvent[]> {
    // Find competitor events in the same market/location
    const competitors = await this.eventAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.location = :location', { location: currentEvent.location })
      .andWhere('analytics.eventType = :eventType', { eventType: currentEvent.eventType })
      .andWhere('analytics.eventId != :eventId', { eventId: currentEvent.eventId })
      .andWhere('analytics.eventDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(currentEvent.eventDate.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(currentEvent.eventDate.getTime() + 90 * 24 * 60 * 60 * 1000),
      })
      .orderBy('analytics.ticketSalesMetrics->>"totalRevenue"', 'DESC')
      .limit(10)
      .getMany();

    return competitors.map(event => ({
      eventId: event.eventId,
      eventName: event.eventName || 'Competitor Event',
      organizerId: event.organizerId,
      eventType: event.eventType || 'general',
      venueCapacity: event.venueCapacity || 1000,
      ticketsSold: event.ticketSalesMetrics?.totalTicketsSold || 0,
      totalRevenue: event.ticketSalesMetrics?.totalRevenue || 0,
      averageTicketPrice: event.ticketSalesMetrics?.averageTicketPrice || 0,
      marketingSpend: event.customMetrics?.marketingSpend || 0,
      socialMediaReach: event.socialMediaMetrics?.totalReach || 0,
      sentimentScore: event.socialMediaMetrics?.overallSentiment || 0,
      eventDate: event.eventDate,
      location: event.location || 'Unknown',
    }));
  }

  private calculatePerformanceMetrics(eventData: any): PerformanceMetrics {
    return {
      revenuePerAttendee: eventData.ticketsSold > 0 ? eventData.totalRevenue / eventData.ticketsSold : 0,
      capacityUtilization: eventData.venueCapacity > 0 ? eventData.ticketsSold / eventData.venueCapacity : 0,
      conversionRate: eventData.conversionRate,
      salesVelocity: eventData.salesVelocity,
      marketingROI: eventData.marketingSpend > 0 ? eventData.totalRevenue / eventData.marketingSpend : 0,
      socialMediaEngagement: eventData.socialMediaReach > 0 ? eventData.ticketsSold / eventData.socialMediaReach * 1000 : 0,
      customerSatisfactionScore: eventData.sentimentScore * 10, // Convert to 0-10 scale
      netPromoterScore: (eventData.sentimentScore - 0.5) * 200, // Convert to NPS scale
    };
  }

  private compareToBenchmarks(metrics: PerformanceMetrics, benchmarks: BenchmarkData): ComparisonResult[] {
    const comparisons: ComparisonResult[] = [];

    const benchmarkMetrics = {
      revenuePerAttendee: benchmarks.averageRevenue / benchmarks.averageAttendance,
      capacityUtilization: benchmarks.averageAttendance / benchmarks.venueCapacity,
      conversionRate: benchmarks.conversionRate,
      salesVelocity: benchmarks.salesVelocity,
      marketingROI: benchmarks.averageRevenue / benchmarks.marketingSpend,
      socialMediaEngagement: benchmarks.averageAttendance / benchmarks.socialMediaReach * 1000,
      customerSatisfactionScore: benchmarks.customerSatisfaction,
      netPromoterScore: (benchmarks.customerSatisfaction - 5) * 20,
    };

    Object.keys(metrics).forEach(key => {
      const currentValue = metrics[key];
      const benchmarkValue = benchmarkMetrics[key] || 0;
      const percentageDifference = benchmarkValue > 0 ? 
        ((currentValue - benchmarkValue) / benchmarkValue) * 100 : 0;

      comparisons.push({
        metric: key,
        currentValue,
        benchmarkValue,
        percentageDifference,
        performance: percentageDifference > 5 ? 'above' : 
                    percentageDifference < -5 ? 'below' : 'at',
        ranking: this.calculateRanking(currentValue, benchmarkValue),
        totalComparisons: 1,
      });
    });

    return comparisons;
  }

  private compareToCompetitors(metrics: PerformanceMetrics, competitors: CompetitorEvent[]): ComparisonResult[] {
    if (competitors.length === 0) return [];

    const comparisons: ComparisonResult[] = [];

    Object.keys(metrics).forEach(key => {
      const currentValue = metrics[key];
      const competitorValues = competitors.map(comp => this.getCompetitorMetric(comp, key));
      const averageCompetitorValue = competitorValues.reduce((sum, val) => sum + val, 0) / competitorValues.length;
      
      const percentageDifference = averageCompetitorValue > 0 ? 
        ((currentValue - averageCompetitorValue) / averageCompetitorValue) * 100 : 0;

      const ranking = competitorValues.filter(val => currentValue > val).length + 1;

      comparisons.push({
        metric: key,
        currentValue,
        benchmarkValue: averageCompetitorValue,
        percentageDifference,
        performance: percentageDifference > 0 ? 'above' : 
                    percentageDifference < 0 ? 'below' : 'at',
        ranking,
        totalComparisons: competitors.length + 1,
      });
    });

    return comparisons;
  }

  private async compareToHistorical(organizerId: string, currentEvent: any) {
    const historicalEvents = await this.eventAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.organizerId = :organizerId', { organizerId })
      .andWhere('analytics.eventId != :eventId', { eventId: currentEvent.eventId })
      .orderBy('analytics.eventDate', 'DESC')
      .limit(10)
      .getMany();

    if (historicalEvents.length === 0) {
      return { message: 'No historical events found for comparison' };
    }

    const avgHistoricalRevenue = historicalEvents.reduce((sum, event) => 
      sum + (event.ticketSalesMetrics?.totalRevenue || 0), 0) / historicalEvents.length;
    
    const avgHistoricalAttendance = historicalEvents.reduce((sum, event) => 
      sum + (event.ticketSalesMetrics?.totalTicketsSold || 0), 0) / historicalEvents.length;

    return {
      totalHistoricalEvents: historicalEvents.length,
      averageRevenue: avgHistoricalRevenue,
      averageAttendance: avgHistoricalAttendance,
      revenueGrowth: avgHistoricalRevenue > 0 ? 
        ((currentEvent.totalRevenue - avgHistoricalRevenue) / avgHistoricalRevenue) * 100 : 0,
      attendanceGrowth: avgHistoricalAttendance > 0 ? 
        ((currentEvent.ticketsSold - avgHistoricalAttendance) / avgHistoricalAttendance) * 100 : 0,
      bestPerformingEvent: historicalEvents.reduce((best, current) => 
        (current.ticketSalesMetrics?.totalRevenue || 0) > (best.ticketSalesMetrics?.totalRevenue || 0) ? 
        current : best, historicalEvents[0]),
    };
  }

  private generateInsights(benchmarkComparisons: ComparisonResult[], competitorComparisons: ComparisonResult[], historicalComparisons: any) {
    const insights = [];

    // Benchmark insights
    const aboveBenchmark = benchmarkComparisons.filter(c => c.performance === 'above').length;
    const totalBenchmarks = benchmarkComparisons.length;
    
    if (aboveBenchmark / totalBenchmarks > 0.7) {
      insights.push({
        type: 'positive',
        category: 'benchmark',
        message: `Event performs above industry benchmark in ${aboveBenchmark}/${totalBenchmarks} key metrics`,
        impact: 'high',
      });
    }

    // Competitor insights
    const topQuartile = competitorComparisons.filter(c => c.ranking <= Math.ceil(c.totalComparisons * 0.25)).length;
    
    if (topQuartile >= competitorComparisons.length * 0.5) {
      insights.push({
        type: 'positive',
        category: 'competition',
        message: 'Event ranks in top quartile against local competitors',
        impact: 'medium',
      });
    }

    // Historical insights
    if (historicalComparisons.revenueGrowth > 20) {
      insights.push({
        type: 'positive',
        category: 'growth',
        message: `Strong revenue growth of ${historicalComparisons.revenueGrowth.toFixed(1)}% compared to historical average`,
        impact: 'high',
      });
    }

    return insights;
  }

  private generateRecommendations(insights: any[], metrics: PerformanceMetrics) {
    const recommendations = [];

    // Revenue optimization
    if (metrics.revenuePerAttendee < 100) {
      recommendations.push({
        category: 'pricing',
        priority: 'high',
        action: 'Consider implementing tiered pricing or premium packages',
        expectedImpact: 'Increase revenue per attendee by 15-25%',
        timeline: '2-3 weeks',
      });
    }

    // Marketing efficiency
    if (metrics.marketingROI < 5) {
      recommendations.push({
        category: 'marketing',
        priority: 'medium',
        action: 'Optimize marketing spend allocation and targeting',
        expectedImpact: 'Improve marketing ROI by 20-30%',
        timeline: '1-2 weeks',
      });
    }

    // Capacity utilization
    if (metrics.capacityUtilization < 0.8) {
      recommendations.push({
        category: 'sales',
        priority: 'high',
        action: 'Increase marketing efforts or adjust pricing strategy',
        expectedImpact: 'Improve capacity utilization to 85-90%',
        timeline: '3-4 weeks',
      });
    }

    return recommendations;
  }

  private calculateOverallScore(comparisons: ComparisonResult[]): number {
    const scores = comparisons.map(c => {
      if (c.performance === 'above') return 100;
      if (c.performance === 'at') return 75;
      return Math.max(0, 50 + c.percentageDifference);
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private determineMarketPosition(comparisons: ComparisonResult[]): string {
    const avgRanking = comparisons.reduce((sum, c) => sum + c.ranking, 0) / comparisons.length;
    const totalCompetitors = comparisons[0]?.totalComparisons || 1;
    const percentile = (totalCompetitors - avgRanking + 1) / totalCompetitors;

    if (percentile >= 0.9) return 'Market Leader';
    if (percentile >= 0.75) return 'Strong Performer';
    if (percentile >= 0.5) return 'Average Performer';
    if (percentile >= 0.25) return 'Below Average';
    return 'Underperformer';
  }

  private getCompetitorMetric(competitor: CompetitorEvent, metric: string): number {
    switch (metric) {
      case 'revenuePerAttendee':
        return competitor.ticketsSold > 0 ? competitor.totalRevenue / competitor.ticketsSold : 0;
      case 'capacityUtilization':
        return competitor.venueCapacity > 0 ? competitor.ticketsSold / competitor.venueCapacity : 0;
      case 'marketingROI':
        return competitor.marketingSpend > 0 ? competitor.totalRevenue / competitor.marketingSpend : 0;
      case 'socialMediaEngagement':
        return competitor.socialMediaReach > 0 ? competitor.ticketsSold / competitor.socialMediaReach * 1000 : 0;
      case 'customerSatisfactionScore':
        return competitor.sentimentScore * 10;
      case 'netPromoterScore':
        return (competitor.sentimentScore - 0.5) * 200;
      default:
        return 0;
    }
  }

  private calculateRanking(currentValue: number, benchmarkValue: number): number {
    return currentValue >= benchmarkValue ? 1 : 2;
  }

  private async updateEventAnalytics(eventId: string, analysis: any) {
    await this.eventAnalyticsRepository.update(
      { eventId },
      {
        comparativeAnalysis: analysis,
        updatedAt: new Date(),
      }
    );
  }
}
