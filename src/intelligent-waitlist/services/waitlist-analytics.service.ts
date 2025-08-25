import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WaitlistAnalytics, AnalyticsPeriod } from '../entities/waitlist-analytics.entity';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistTicketRelease, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';

@Injectable()
export class WaitlistAnalyticsService {
  private readonly logger = new Logger(WaitlistAnalyticsService.name);

  constructor(
    @InjectRepository(WaitlistAnalytics)
    private analyticsRepository: Repository<WaitlistAnalytics>,
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
  ) {}

  /**
   * Get comprehensive waitlist analytics for an event
   */
  async getEventAnalytics(eventId: string, period: AnalyticsPeriod = AnalyticsPeriod.DAILY): Promise<{
    overview: any;
    trends: any[];
    conversionFunnel: any;
    priorityBreakdown: any;
    notificationMetrics: any;
    demandInsights: any;
    revenueImpact: any;
  }> {
    const [overview, trends, conversionFunnel, priorityBreakdown, notificationMetrics, demandInsights, revenueImpact] = await Promise.all([
      this.getOverviewMetrics(eventId),
      this.getTrendData(eventId, period),
      this.getConversionFunnel(eventId),
      this.getPriorityBreakdown(eventId),
      this.getNotificationMetrics(eventId),
      this.getDemandInsights(eventId),
      this.getRevenueImpact(eventId),
    ]);

    return {
      overview,
      trends,
      conversionFunnel,
      priorityBreakdown,
      notificationMetrics,
      demandInsights,
      revenueImpact,
    };
  }

  /**
   * Get real-time waitlist overview
   */
  async getOverviewMetrics(eventId: string): Promise<{
    totalWaitlisted: number;
    activeWaitlisted: number;
    totalConverted: number;
    conversionRate: number;
    averageWaitTime: number;
    peakWaitlistSize: number;
    currentPositions: any[];
  }> {
    const [
      totalWaitlisted,
      activeWaitlisted,
      totalConverted,
      averageWaitTime,
      peakWaitlistSize,
      currentPositions,
    ] = await Promise.all([
      this.waitlistRepository.count({ where: { eventId } }),
      this.waitlistRepository.count({ where: { eventId, status: WaitlistStatus.ACTIVE } }),
      this.waitlistRepository.count({ where: { eventId, status: WaitlistStatus.CONVERTED } }),
      this.calculateAverageWaitTime(eventId),
      this.getPeakWaitlistSize(eventId),
      this.getCurrentPositions(eventId),
    ]);

    const conversionRate = totalWaitlisted > 0 ? (totalConverted / totalWaitlisted) * 100 : 0;

    return {
      totalWaitlisted,
      activeWaitlisted,
      totalConverted,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageWaitTime,
      peakWaitlistSize,
      currentPositions,
    };
  }

  /**
   * Get trend data over time
   */
  async getTrendData(eventId: string, period: AnalyticsPeriod): Promise<any[]> {
    const endDate = new Date();
    const startDate = this.getStartDate(period, endDate);

    const analytics = await this.analyticsRepository.find({
      where: {
        eventId,
        period,
        periodStart: Between(startDate, endDate),
      },
      order: { periodStart: 'ASC' },
    });

    return analytics.map(record => ({
      date: record.periodStart,
      joined: record.totalJoined,
      converted: record.totalConverted,
      conversionRate: record.conversionRate,
      waitlistSize: record.peakWaitlistSize,
      averageWaitTime: record.averageWaitTime,
    }));
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(eventId: string): Promise<{
    stages: any[];
    dropoffPoints: any[];
    optimizationSuggestions: string[];
  }> {
    const [
      totalJoined,
      totalNotified,
      totalResponded,
      totalConverted,
      avgResponseTime,
    ] = await Promise.all([
      this.waitlistRepository.count({ where: { eventId } }),
      this.waitlistRepository.count({ where: { eventId, status: WaitlistStatus.NOTIFIED } }),
      this.releaseRepository.count({ 
        where: { 
          eventId, 
          status: In([ReleaseStatus.ACCEPTED, ReleaseStatus.DECLINED]) 
        } 
      }),
      this.waitlistRepository.count({ where: { eventId, status: WaitlistStatus.CONVERTED } }),
      this.calculateAverageResponseTime(eventId),
    ]);

    const stages = [
      { stage: 'Joined Waitlist', count: totalJoined, percentage: 100 },
      { 
        stage: 'Received Notification', 
        count: totalNotified, 
        percentage: totalJoined > 0 ? (totalNotified / totalJoined) * 100 : 0 
      },
      { 
        stage: 'Responded to Offer', 
        count: totalResponded, 
        percentage: totalNotified > 0 ? (totalResponded / totalNotified) * 100 : 0 
      },
      { 
        stage: 'Completed Purchase', 
        count: totalConverted, 
        percentage: totalResponded > 0 ? (totalConverted / totalResponded) * 100 : 0 
      },
    ];

    const dropoffPoints = this.identifyDropoffPoints(stages);
    const optimizationSuggestions = this.generateOptimizationSuggestions(stages, avgResponseTime);

    return { stages, dropoffPoints, optimizationSuggestions };
  }

  /**
   * Get priority tier breakdown
   */
  async getPriorityBreakdown(eventId: string): Promise<any> {
    const priorities = Object.values(WaitlistPriority);
    const breakdown = {};

    for (const priority of priorities) {
      const [total, converted, avgWaitTime] = await Promise.all([
        this.waitlistRepository.count({ where: { eventId, priority } }),
        this.waitlistRepository.count({ where: { eventId, priority, status: WaitlistStatus.CONVERTED } }),
        this.calculateAverageWaitTimeByPriority(eventId, priority),
      ]);

      breakdown[priority] = {
        total,
        converted,
        conversionRate: total > 0 ? (converted / total) * 100 : 0,
        averageWaitTime: avgWaitTime,
      };
    }

    return breakdown;
  }

  /**
   * Get notification performance metrics
   */
  async getNotificationMetrics(eventId: string): Promise<{
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    channelPerformance: any;
  }> {
    const releases = await this.releaseRepository.find({
      where: { eventId },
      select: ['notificationDetails', 'status'],
    });

    let totalSent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let responded = 0;
    const channelStats = {};

    releases.forEach(release => {
      if (release.notificationDetails) {
        totalSent++;
        
        if (release.notificationDetails.deliveryStatus === 'delivered') delivered++;
        if (release.notificationDetails.openedAt) opened++;
        if (release.notificationDetails.clickedAt) clicked++;
        if ([ReleaseStatus.ACCEPTED, ReleaseStatus.DECLINED].includes(release.status)) responded++;

        // Track channel performance
        release.notificationDetails.channels?.forEach(channel => {
          if (!channelStats[channel]) {
            channelStats[channel] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
          }
          channelStats[channel].sent++;
          if (release.notificationDetails.deliveryStatus === 'delivered') channelStats[channel].delivered++;
          if (release.notificationDetails.openedAt) channelStats[channel].opened++;
          if (release.notificationDetails.clickedAt) channelStats[channel].clicked++;
        });
      }
    });

    return {
      totalSent,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      responseRate: totalSent > 0 ? (responded / totalSent) * 100 : 0,
      channelPerformance: channelStats,
    };
  }

  /**
   * Get demand insights
   */
  async getDemandInsights(eventId: string): Promise<{
    peakJoinTimes: any[];
    popularSeatPreferences: any[];
    priceWillingnessDistribution: any[];
    geographicDistribution: any[];
    deviceBreakdown: any[];
  }> {
    const entries = await this.waitlistRepository.find({
      where: { eventId },
      select: ['createdAt', 'seatPreferences', 'maxPriceWilling', 'metadata'],
    });

    const peakJoinTimes = this.analyzePeakJoinTimes(entries);
    const popularSeatPreferences = this.analyzePopularSeatPreferences(entries);
    const priceWillingnessDistribution = this.analyzePriceWillingness(entries);
    const geographicDistribution = this.analyzeGeographicDistribution(entries);
    const deviceBreakdown = this.analyzeDeviceBreakdown(entries);

    return {
      peakJoinTimes,
      popularSeatPreferences,
      priceWillingnessDistribution,
      geographicDistribution,
      deviceBreakdown,
    };
  }

  /**
   * Get revenue impact analysis
   */
  async getRevenueImpact(eventId: string): Promise<{
    totalRevenueGenerated: number;
    averageTicketPrice: number;
    potentialRevenueLost: number;
    revenueByPriority: any;
    conversionValue: number;
  }> {
    const [convertedEntries, releases] = await Promise.all([
      this.waitlistRepository.find({
        where: { eventId, status: WaitlistStatus.CONVERTED },
        select: ['priority', 'ticketQuantity'],
      }),
      this.releaseRepository.find({
        where: { eventId, status: ReleaseStatus.ACCEPTED },
        select: ['offerPrice', 'ticketQuantity'],
      }),
    ]);

    const totalRevenueGenerated = releases.reduce((sum, release) => 
      sum + (release.offerPrice * release.ticketQuantity), 0
    );

    const totalTickets = releases.reduce((sum, release) => sum + release.ticketQuantity, 0);
    const averageTicketPrice = totalTickets > 0 ? totalRevenueGenerated / totalTickets : 0;

    // Calculate potential revenue lost from non-conversions
    const totalWaitlisted = await this.waitlistRepository.count({ where: { eventId } });
    const potentialRevenueLost = (totalWaitlisted - convertedEntries.length) * averageTicketPrice;

    const revenueByPriority = this.calculateRevenueByPriority(convertedEntries, releases);
    const conversionValue = totalRevenueGenerated / Math.max(1, totalWaitlisted);

    return {
      totalRevenueGenerated,
      averageTicketPrice,
      potentialRevenueLost,
      revenueByPriority,
      conversionValue,
    };
  }

  /**
   * Generate analytics report for organizers
   */
  async generateAnalyticsReport(eventId: string): Promise<{
    summary: any;
    recommendations: string[];
    keyMetrics: any;
    trends: any;
    actionItems: any[];
  }> {
    const analytics = await this.getEventAnalytics(eventId);
    
    const summary = {
      totalWaitlisted: analytics.overview.totalWaitlisted,
      conversionRate: analytics.overview.conversionRate,
      revenueGenerated: analytics.revenueImpact.totalRevenueGenerated,
      averageWaitTime: analytics.overview.averageWaitTime,
    };

    const recommendations = this.generateRecommendations(analytics);
    const keyMetrics = this.extractKeyMetrics(analytics);
    const actionItems = this.generateActionItems(analytics);

    return {
      summary,
      recommendations,
      keyMetrics,
      trends: analytics.trends,
      actionItems,
    };
  }

  /**
   * Scheduled job to update analytics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateHourlyAnalytics(): Promise<void> {
    this.logger.log('Updating hourly waitlist analytics');
    await this.updateAnalyticsForPeriod(AnalyticsPeriod.HOURLY);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateDailyAnalytics(): Promise<void> {
    this.logger.log('Updating daily waitlist analytics');
    await this.updateAnalyticsForPeriod(AnalyticsPeriod.DAILY);
  }

  // Private helper methods

  private async updateAnalyticsForPeriod(period: AnalyticsPeriod): Promise<void> {
    const events = await this.getActiveEvents();
    
    for (const eventId of events) {
      await this.calculateAndSaveAnalytics(eventId, period);
    }
  }

  private async calculateAndSaveAnalytics(eventId: string, period: AnalyticsPeriod): Promise<void> {
    const { periodStart, periodEnd } = this.getPeriodBounds(period);
    
    const analytics = await this.calculatePeriodAnalytics(eventId, periodStart, periodEnd);
    
    await this.analyticsRepository.upsert({
      eventId,
      period,
      periodStart,
      periodEnd,
      ...analytics,
    }, ['eventId', 'period', 'periodStart']);
  }

  private async calculatePeriodAnalytics(eventId: string, start: Date, end: Date): Promise<any> {
    // Implementation would calculate all metrics for the period
    return {
      totalJoined: 0,
      totalLeft: 0,
      totalNotified: 0,
      totalConverted: 0,
      // ... other metrics
    };
  }

  private getPeriodBounds(period: AnalyticsPeriod): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;
    
    switch (period) {
      case AnalyticsPeriod.HOURLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        break;
      case AnalyticsPeriod.DAILY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case AnalyticsPeriod.WEEKLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case AnalyticsPeriod.MONTHLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const periodEnd = new Date(periodStart);
    periodEnd.setHours(23, 59, 59, 999);
    
    return { periodStart, periodEnd };
  }

  private getStartDate(period: AnalyticsPeriod, endDate: Date): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case AnalyticsPeriod.HOURLY:
        start.setDate(start.getDate() - 1);
        break;
      case AnalyticsPeriod.DAILY:
        start.setDate(start.getDate() - 30);
        break;
      case AnalyticsPeriod.WEEKLY:
        start.setDate(start.getDate() - 84); // 12 weeks
        break;
      case AnalyticsPeriod.MONTHLY:
        start.setMonth(start.getMonth() - 12);
        break;
    }
    
    return start;
  }

  private async getActiveEvents(): Promise<string[]> {
    // Implementation would get active event IDs
    return [];
  }

  private async calculateAverageWaitTime(eventId: string): Promise<number> {
    // Implementation would calculate average wait time
    return 0;
  }

  private async getPeakWaitlistSize(eventId: string): Promise<number> {
    // Implementation would get peak waitlist size
    return 0;
  }

  private async getCurrentPositions(eventId: string): Promise<any[]> {
    // Implementation would get current position distribution
    return [];
  }

  private async calculateAverageResponseTime(eventId: string): Promise<number> {
    // Implementation would calculate average response time
    return 0;
  }

  private async calculateAverageWaitTimeByPriority(eventId: string, priority: WaitlistPriority): Promise<number> {
    // Implementation would calculate average wait time by priority
    return 0;
  }

  private identifyDropoffPoints(stages: any[]): any[] {
    // Implementation would identify major dropoff points
    return [];
  }

  private generateOptimizationSuggestions(stages: any[], avgResponseTime: number): string[] {
    // Implementation would generate optimization suggestions
    return [];
  }

  private analyzePeakJoinTimes(entries: any[]): any[] {
    // Implementation would analyze peak join times
    return [];
  }

  private analyzePopularSeatPreferences(entries: any[]): any[] {
    // Implementation would analyze seat preferences
    return [];
  }

  private analyzePriceWillingness(entries: any[]): any[] {
    // Implementation would analyze price willingness
    return [];
  }

  private analyzeGeographicDistribution(entries: any[]): any[] {
    // Implementation would analyze geographic distribution
    return [];
  }

  private analyzeDeviceBreakdown(entries: any[]): any[] {
    // Implementation would analyze device breakdown
    return [];
  }

  private calculateRevenueByPriority(entries: any[], releases: any[]): any {
    // Implementation would calculate revenue by priority
    return {};
  }

  private generateRecommendations(analytics: any): string[] {
    // Implementation would generate recommendations
    return [];
  }

  private extractKeyMetrics(analytics: any): any {
    // Implementation would extract key metrics
    return {};
  }

  private generateActionItems(analytics: any): any[] {
    // Implementation would generate action items
    return [];
  }
}
