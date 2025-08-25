import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletPass, PassStatus, PassType } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';
import { PassTemplate } from '../entities/pass-template.entity';

export interface PassAnalyticsOverview {
  totalPasses: number;
  activePassesCount: number;
  passesCreatedToday: number;
  passesCreatedThisWeek: number;
  passesCreatedThisMonth: number;
  passStatusBreakdown: Record<PassStatus, number>;
  passTypeBreakdown: Record<PassType, number>;
  conversionRate: number;
  averagePassLifetime: number;
}

export interface PassEngagementMetrics {
  totalViews: number;
  uniqueViewers: number;
  totalShares: number;
  totalQRScans: number;
  locationTriggers: number;
  beaconTriggers: number;
  averageViewsPerPass: number;
  engagementRate: number;
  viewsByDay: Array<{ date: string; views: number }>;
  topPerformingPasses: Array<{
    passId: string;
    eventName: string;
    views: number;
    shares: number;
    qrScans: number;
  }>;
}

export interface PassPerformanceReport {
  passId: string;
  eventName: string;
  passType: PassType;
  status: PassStatus;
  createdAt: Date;
  installedAt?: Date;
  lastViewedAt?: Date;
  totalViews: number;
  uniqueViewers: number;
  totalShares: number;
  qrScans: number;
  locationTriggers: number;
  beaconTriggers: number;
  engagementScore: number;
  timeToInstall?: number; // minutes
  daysActive: number;
}

export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class PassAnalyticsService {
  private readonly logger = new Logger(PassAnalyticsService.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    @InjectRepository(PassTemplate)
    private templateRepository: Repository<PassTemplate>,
  ) {}

  /**
   * Get comprehensive analytics overview
   */
  async getAnalyticsOverview(
    organizerId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<PassAnalyticsOverview> {
    this.logger.log(`Getting analytics overview for organizer: ${organizerId || 'all'}`);

    const whereClause: any = {};
    if (organizerId) {
      whereClause.event = { organizerId };
    }

    // Get total passes
    const totalPasses = await this.passRepository.count({ where: whereClause });

    // Get active passes
    const activePassesCount = await this.passRepository.count({
      where: { ...whereClause, status: PassStatus.ACTIVE },
    });

    // Get passes created in different time periods
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const passesCreatedToday = await this.passRepository.count({
      where: { ...whereClause, createdAt: { $gte: today } as any },
    });

    const passesCreatedThisWeek = await this.passRepository.count({
      where: { ...whereClause, createdAt: { $gte: thisWeek } as any },
    });

    const passesCreatedThisMonth = await this.passRepository.count({
      where: { ...whereClause, createdAt: { $gte: thisMonth } as any },
    });

    // Get status breakdown
    const statusBreakdown = await this.getPassStatusBreakdown(whereClause);

    // Get type breakdown
    const typeBreakdown = await this.getPassTypeBreakdown(whereClause);

    // Calculate conversion rate (installed / created)
    const installedPasses = await this.passRepository.count({
      where: { ...whereClause, installedAt: { $ne: null } as any },
    });
    const conversionRate = totalPasses > 0 ? (installedPasses / totalPasses) * 100 : 0;

    // Calculate average pass lifetime
    const averagePassLifetime = await this.calculateAveragePassLifetime(whereClause);

    return {
      totalPasses,
      activePassesCount,
      passesCreatedToday,
      passesCreatedThisWeek,
      passesCreatedThisMonth,
      passStatusBreakdown: statusBreakdown,
      passTypeBreakdown: typeBreakdown,
      conversionRate,
      averagePassLifetime,
    };
  }

  /**
   * Get pass engagement metrics
   */
  async getEngagementMetrics(
    organizerId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<PassEngagementMetrics> {
    this.logger.log(`Getting engagement metrics for organizer: ${organizerId || 'all'}`);

    const analyticsWhere: any = {};
    if (timeRange) {
      analyticsWhere.timestamp = {
        $gte: timeRange.startDate,
        $lte: timeRange.endDate,
      };
    }

    if (organizerId) {
      // Get pass IDs for this organizer
      const organizerPasses = await this.passRepository.find({
        where: { event: { organizerId } },
        select: ['id'],
      });
      const passIds = organizerPasses.map(p => p.id);
      analyticsWhere.walletPassId = { $in: passIds };
    }

    // Get view analytics
    const viewAnalytics = await this.analyticsRepository.find({
      where: { ...analyticsWhere, eventType: AnalyticsEventType.PASS_VIEWED },
    });

    // Get share analytics
    const shareAnalytics = await this.analyticsRepository.find({
      where: { ...analyticsWhere, eventType: AnalyticsEventType.PASS_SHARED },
    });

    // Get QR scan analytics
    const qrScanAnalytics = await this.analyticsRepository.find({
      where: { ...analyticsWhere, eventType: AnalyticsEventType.QR_CODE_SCANNED },
    });

    // Get location trigger analytics
    const locationTriggerAnalytics = await this.analyticsRepository.find({
      where: { ...analyticsWhere, eventType: AnalyticsEventType.LOCATION_TRIGGERED },
    });

    // Get beacon trigger analytics
    const beaconTriggerAnalytics = await this.analyticsRepository.find({
      where: { ...analyticsWhere, eventType: AnalyticsEventType.BEACON_TRIGGERED },
    });

    const totalViews = viewAnalytics.length;
    const uniqueViewers = new Set(viewAnalytics.map(v => v.deviceId).filter(Boolean)).size;
    const totalShares = shareAnalytics.reduce((sum, s) => sum + (s.eventData?.shareCount || 1), 0);
    const totalQRScans = qrScanAnalytics.length;
    const locationTriggers = locationTriggerAnalytics.length;
    const beaconTriggers = beaconTriggerAnalytics.length;

    // Calculate average views per pass
    const uniquePasses = new Set([...viewAnalytics.map(v => v.walletPassId)]).size;
    const averageViewsPerPass = uniquePasses > 0 ? totalViews / uniquePasses : 0;

    // Calculate engagement rate
    const totalPasses = organizerId 
      ? await this.passRepository.count({ where: { event: { organizerId } } })
      : await this.passRepository.count();
    const engagementRate = totalPasses > 0 ? (uniquePasses / totalPasses) * 100 : 0;

    // Group views by day
    const viewsByDay = this.groupAnalyticsByDay(viewAnalytics, 30);

    // Get top performing passes
    const topPerformingPasses = await this.getTopPerformingPasses(organizerId, 10);

    return {
      totalViews,
      uniqueViewers,
      totalShares,
      totalQRScans,
      locationTriggers,
      beaconTriggers,
      averageViewsPerPass,
      engagementRate,
      viewsByDay,
      topPerformingPasses,
    };
  }

  /**
   * Get detailed performance report for a specific pass
   */
  async getPassPerformanceReport(passId: string): Promise<PassPerformanceReport> {
    this.logger.log(`Getting performance report for pass: ${passId}`);

    const pass = await this.passRepository.findOne({
      where: { id: passId },
      relations: ['event'],
    });

    if (!pass) {
      throw new Error('Pass not found');
    }

    // Get all analytics for this pass
    const analytics = await this.analyticsRepository.find({
      where: { walletPassId: passId },
      order: { timestamp: 'ASC' },
    });

    // Calculate metrics
    const viewAnalytics = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_VIEWED);
    const shareAnalytics = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_SHARED);
    const qrScanAnalytics = analytics.filter(a => a.eventType === AnalyticsEventType.QR_CODE_SCANNED);
    const locationTriggerAnalytics = analytics.filter(a => a.eventType === AnalyticsEventType.LOCATION_TRIGGERED);
    const beaconTriggerAnalytics = analytics.filter(a => a.eventType === AnalyticsEventType.BEACON_TRIGGERED);

    const totalViews = viewAnalytics.length;
    const uniqueViewers = new Set(viewAnalytics.map(v => v.deviceId).filter(Boolean)).size;
    const totalShares = shareAnalytics.reduce((sum, s) => sum + (s.eventData?.shareCount || 1), 0);
    const qrScans = qrScanAnalytics.length;
    const locationTriggers = locationTriggerAnalytics.length;
    const beaconTriggers = beaconTriggerAnalytics.length;

    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagementScore({
      views: totalViews,
      shares: totalShares,
      qrScans,
      locationTriggers,
      beaconTriggers,
    });

    // Calculate time to install
    let timeToInstall: number | undefined;
    if (pass.installedAt && pass.createdAt) {
      timeToInstall = Math.floor((pass.installedAt.getTime() - pass.createdAt.getTime()) / (1000 * 60));
    }

    // Calculate days active
    const daysActive = Math.floor((Date.now() - pass.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      passId: pass.id,
      eventName: pass.event.name,
      passType: pass.passType,
      status: pass.status,
      createdAt: pass.createdAt,
      installedAt: pass.installedAt,
      lastViewedAt: pass.lastViewedAt,
      totalViews,
      uniqueViewers,
      totalShares,
      qrScans,
      locationTriggers,
      beaconTriggers,
      engagementScore,
      timeToInstall,
      daysActive,
    };
  }

  /**
   * Get template performance analytics
   */
  async getTemplateAnalytics(templateId: string): Promise<{
    templateId: string;
    templateName: string;
    totalPasses: number;
    averageEngagementScore: number;
    conversionRate: number;
    topPerformingEvents: Array<{
      eventId: string;
      eventName: string;
      passCount: number;
      averageEngagement: number;
    }>;
    performanceByPassType: Array<{
      passType: PassType;
      passCount: number;
      averageEngagement: number;
      conversionRate: number;
    }>;
  }> {
    const template = await this.templateRepository.findOne({ where: { id: templateId } });
    if (!template) {
      throw new Error('Template not found');
    }

    const passes = await this.passRepository.find({
      where: { templateId },
      relations: ['event'],
    });

    const totalPasses = passes.length;

    // Calculate average engagement score
    const engagementScores = await Promise.all(
      passes.map(async pass => {
        const report = await this.getPassPerformanceReport(pass.id);
        return report.engagementScore;
      })
    );

    const averageEngagementScore = engagementScores.length > 0 
      ? engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length 
      : 0;

    // Calculate conversion rate
    const installedPasses = passes.filter(p => p.installedAt).length;
    const conversionRate = totalPasses > 0 ? (installedPasses / totalPasses) * 100 : 0;

    // Group by events
    const eventGroups = passes.reduce((acc, pass) => {
      const eventId = pass.eventId;
      if (!acc[eventId]) {
        acc[eventId] = {
          eventId,
          eventName: pass.event.name,
          passes: [],
        };
      }
      acc[eventId].passes.push(pass);
      return acc;
    }, {} as Record<string, any>);

    const topPerformingEvents = await Promise.all(
      Object.values(eventGroups).map(async (group: any) => {
        const eventEngagementScores = await Promise.all(
          group.passes.map(async (pass: WalletPass) => {
            const report = await this.getPassPerformanceReport(pass.id);
            return report.engagementScore;
          })
        );

        const averageEngagement = eventEngagementScores.length > 0
          ? eventEngagementScores.reduce((sum, score) => sum + score, 0) / eventEngagementScores.length
          : 0;

        return {
          eventId: group.eventId,
          eventName: group.eventName,
          passCount: group.passes.length,
          averageEngagement,
        };
      })
    );

    // Group by pass type
    const passTypeGroups = passes.reduce((acc, pass) => {
      if (!acc[pass.passType]) {
        acc[pass.passType] = [];
      }
      acc[pass.passType].push(pass);
      return acc;
    }, {} as Record<PassType, WalletPass[]>);

    const performanceByPassType = await Promise.all(
      Object.entries(passTypeGroups).map(async ([passType, typePasses]) => {
        const typeEngagementScores = await Promise.all(
          typePasses.map(async pass => {
            const report = await this.getPassPerformanceReport(pass.id);
            return report.engagementScore;
          })
        );

        const averageEngagement = typeEngagementScores.length > 0
          ? typeEngagementScores.reduce((sum, score) => sum + score, 0) / typeEngagementScores.length
          : 0;

        const typeInstalledPasses = typePasses.filter(p => p.installedAt).length;
        const typeConversionRate = typePasses.length > 0 
          ? (typeInstalledPasses / typePasses.length) * 100 
          : 0;

        return {
          passType: passType as PassType,
          passCount: typePasses.length,
          averageEngagement,
          conversionRate: typeConversionRate,
        };
      })
    );

    return {
      templateId,
      templateName: template.name,
      totalPasses,
      averageEngagementScore,
      conversionRate,
      topPerformingEvents: topPerformingEvents.sort((a, b) => b.averageEngagement - a.averageEngagement),
      performanceByPassType,
    };
  }

  /**
   * Get comparative analytics between different time periods
   */
  async getComparativeAnalytics(
    organizerId?: string,
    currentPeriod: AnalyticsTimeRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    previousPeriod: AnalyticsTimeRange = {
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }
  ): Promise<{
    currentPeriod: PassEngagementMetrics;
    previousPeriod: PassEngagementMetrics;
    changes: {
      totalViews: { value: number; percentage: number };
      totalShares: { value: number; percentage: number };
      totalQRScans: { value: number; percentage: number };
      engagementRate: { value: number; percentage: number };
    };
  }> {
    const currentMetrics = await this.getEngagementMetrics(organizerId, currentPeriod);
    const previousMetrics = await this.getEngagementMetrics(organizerId, previousPeriod);

    const calculateChange = (current: number, previous: number) => ({
      value: current - previous,
      percentage: previous > 0 ? ((current - previous) / previous) * 100 : 0,
    });

    return {
      currentPeriod: currentMetrics,
      previousPeriod: previousMetrics,
      changes: {
        totalViews: calculateChange(currentMetrics.totalViews, previousMetrics.totalViews),
        totalShares: calculateChange(currentMetrics.totalShares, previousMetrics.totalShares),
        totalQRScans: calculateChange(currentMetrics.totalQRScans, previousMetrics.totalQRScans),
        engagementRate: calculateChange(currentMetrics.engagementRate, previousMetrics.engagementRate),
      },
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    organizerId?: string,
    timeRange?: AnalyticsTimeRange,
    format: 'json' | 'csv' = 'json'
  ): Promise<{
    data: any;
    filename: string;
    contentType: string;
  }> {
    const overview = await this.getAnalyticsOverview(organizerId, timeRange);
    const engagement = await this.getEngagementMetrics(organizerId, timeRange);

    const exportData = {
      overview,
      engagement,
      exportedAt: new Date().toISOString(),
      timeRange,
      organizerId,
    };

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `wallet-analytics-${organizerId || 'all'}-${timestamp}`;

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = this.convertToCSV(exportData);
      return {
        data: csvData,
        filename: `${filename}.csv`,
        contentType: 'text/csv',
      };
    }

    return {
      data: exportData,
      filename: `${filename}.json`,
      contentType: 'application/json',
    };
  }

  // Private helper methods

  private async getPassStatusBreakdown(whereClause: any): Promise<Record<PassStatus, number>> {
    const statusCounts = await this.passRepository
      .createQueryBuilder('pass')
      .select('pass.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(whereClause)
      .groupBy('pass.status')
      .getRawMany();

    const breakdown = {} as Record<PassStatus, number>;
    Object.values(PassStatus).forEach(status => {
      breakdown[status] = 0;
    });

    statusCounts.forEach(item => {
      breakdown[item.status as PassStatus] = parseInt(item.count);
    });

    return breakdown;
  }

  private async getPassTypeBreakdown(whereClause: any): Promise<Record<PassType, number>> {
    const typeCounts = await this.passRepository
      .createQueryBuilder('pass')
      .select('pass.passType', 'passType')
      .addSelect('COUNT(*)', 'count')
      .where(whereClause)
      .groupBy('pass.passType')
      .getRawMany();

    const breakdown = {} as Record<PassType, number>;
    Object.values(PassType).forEach(type => {
      breakdown[type] = 0;
    });

    typeCounts.forEach(item => {
      breakdown[item.passType as PassType] = parseInt(item.count);
    });

    return breakdown;
  }

  private async calculateAveragePassLifetime(whereClause: any): Promise<number> {
    const passes = await this.passRepository.find({
      where: whereClause,
      select: ['createdAt', 'expiresAt'],
    });

    if (passes.length === 0) return 0;

    const lifetimes = passes
      .filter(p => p.expiresAt)
      .map(p => p.expiresAt!.getTime() - p.createdAt.getTime());

    if (lifetimes.length === 0) return 0;

    const averageLifetimeMs = lifetimes.reduce((sum, lifetime) => sum + lifetime, 0) / lifetimes.length;
    return Math.floor(averageLifetimeMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private groupAnalyticsByDay(analytics: PassAnalytics[], days: number): Array<{ date: string; views: number }> {
    const dayMap = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap.set(dateStr, 0);
    }

    // Count analytics by day
    analytics.forEach(analytic => {
      const dateStr = analytic.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, dayMap.get(dateStr)! + 1);
      }
    });

    // Convert to array and sort by date
    return Array.from(dayMap.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTopPerformingPasses(organizerId?: string, limit: number = 10): Promise<Array<{
    passId: string;
    eventName: string;
    views: number;
    shares: number;
    qrScans: number;
  }>> {
    const whereClause: any = {};
    if (organizerId) {
      whereClause.event = { organizerId };
    }

    const passes = await this.passRepository.find({
      where: whereClause,
      relations: ['event'],
      take: limit * 2, // Get more to account for filtering
    });

    const passPerformance = await Promise.all(
      passes.map(async pass => {
        const analytics = await this.analyticsRepository.find({
          where: { walletPassId: pass.id },
        });

        const views = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_VIEWED).length;
        const shares = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_SHARED)
          .reduce((sum, s) => sum + (s.eventData?.shareCount || 1), 0);
        const qrScans = analytics.filter(a => a.eventType === AnalyticsEventType.QR_CODE_SCANNED).length;

        return {
          passId: pass.id,
          eventName: pass.event.name,
          views,
          shares,
          qrScans,
          totalEngagement: views + shares + qrScans,
        };
      })
    );

    return passPerformance
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, limit)
      .map(({ totalEngagement, ...rest }) => rest);
  }

  private calculateEngagementScore(metrics: {
    views: number;
    shares: number;
    qrScans: number;
    locationTriggers: number;
    beaconTriggers: number;
  }): number {
    // Weighted engagement score (0-100)
    const weights = {
      views: 1,
      shares: 3,
      qrScans: 2,
      locationTriggers: 1.5,
      beaconTriggers: 1.5,
    };

    const weightedScore = 
      metrics.views * weights.views +
      metrics.shares * weights.shares +
      metrics.qrScans * weights.qrScans +
      metrics.locationTriggers * weights.locationTriggers +
      metrics.beaconTriggers * weights.beaconTriggers;

    // Normalize to 0-100 scale (adjust max value based on expected engagement)
    const maxExpectedScore = 100; // Adjust based on typical engagement patterns
    return Math.min(100, (weightedScore / maxExpectedScore) * 100);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Passes', data.overview.totalPasses],
      ['Active Passes', data.overview.activePassesCount],
      ['Total Views', data.engagement.totalViews],
      ['Total Shares', data.engagement.totalShares],
      ['Total QR Scans', data.engagement.totalQRScans],
      ['Engagement Rate', data.engagement.engagementRate],
    ];

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}
