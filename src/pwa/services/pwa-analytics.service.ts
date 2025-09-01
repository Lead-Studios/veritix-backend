import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PWAAnalytics, PWAEventType, DeviceOrientation } from '../entities/pwa-analytics.entity';
import { PWASubscription } from '../entities/pwa-subscription.entity';
import { BackgroundSyncJob } from '../entities/background-sync.entity';

export interface AnalyticsFilter {
  userId?: string;
  eventType?: PWAEventType;
  startDate?: Date;
  endDate?: Date;
  deviceType?: string;
  isOnline?: boolean;
  isStandalone?: boolean;
}

export interface PWAMetrics {
  totalEvents: number;
  uniqueUsers: number;
  installRate: number;
  offlineUsage: number;
  pushNotificationEngagement: number;
  averageSessionDuration: number;
  topDevices: Array<{ device: string; count: number }>;
  performanceMetrics: {
    averageLoadTime: number;
    cacheHitRate: number;
    networkErrorRate: number;
  };
}

@Injectable()
export class PWAAnalyticsService {
  private readonly logger = new Logger(PWAAnalyticsService.name);

  constructor(
    @InjectRepository(PWAAnalytics)
    private analyticsRepository: Repository<PWAAnalytics>,
    @InjectRepository(PWASubscription)
    private subscriptionRepository: Repository<PWASubscription>,
    @InjectRepository(BackgroundSyncJob)
    private syncJobRepository: Repository<BackgroundSyncJob>,
  ) {}

  async trackEvent(
    userId: string,
    eventType: PWAEventType,
    sessionId: string,
    eventData?: {
      url?: string;
      userAgent?: string;
      deviceType?: string;
      browserName?: string;
      osName?: string;
      orientation?: DeviceOrientation;
      screenWidth?: number;
      screenHeight?: number;
      networkType?: string;
      isOnline?: boolean;
      isStandalone?: boolean;
      batteryLevel?: number;
      performanceMetrics?: Record<string, any>;
      eventData?: Record<string, any>;
      referrer?: string;
      ipAddress?: string;
      country?: string;
      city?: string;
      timezone?: string;
    },
  ): Promise<PWAAnalytics> {
    const analytics = this.analyticsRepository.create({
      userId,
      sessionId,
      eventType,
      ...eventData,
    });

    return this.analyticsRepository.save(analytics);
  }

  async getGlobalMetrics(filter: AnalyticsFilter = {}): Promise<PWAMetrics> {
    const query = this.analyticsRepository.createQueryBuilder('analytics');

    this.applyFilters(query, filter);

    const [
      totalEvents,
      uniqueUsers,
      installs,
      offlineEvents,
      notificationClicks,
      notificationReceived,
    ] = await Promise.all([
      query.getCount(),
      query.select('COUNT(DISTINCT analytics.userId)', 'count').getRawOne(),
      query.clone().andWhere('analytics.eventType = :type', { type: PWAEventType.APP_INSTALL }).getCount(),
      query.clone().andWhere('analytics.eventType = :type', { type: PWAEventType.OFFLINE_ACCESS }).getCount(),
      query.clone().andWhere('analytics.eventType = :type', { type: PWAEventType.PUSH_NOTIFICATION_CLICKED }).getCount(),
      query.clone().andWhere('analytics.eventType = :type', { type: PWAEventType.PUSH_NOTIFICATION_RECEIVED }).getCount(),
    ]);

    // Get device statistics
    const deviceStats = await query
      .select('analytics.deviceType', 'device')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analytics.deviceType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Get performance metrics
    const performanceData = await query
      .select('AVG((analytics.performanceMetrics->>\'loadTime\')::numeric)', 'avgLoadTime')
      .addSelect('AVG((analytics.performanceMetrics->>\'cacheHitRate\')::numeric)', 'cacheHitRate')
      .where('analytics.performanceMetrics IS NOT NULL')
      .getRawOne();

    // Calculate network error rate
    const networkErrors = await query
      .clone()
      .andWhere('analytics.eventType = :type', { type: PWAEventType.NETWORK_ERROR })
      .getCount();

    return {
      totalEvents,
      uniqueUsers: parseInt(uniqueUsers?.count || '0'),
      installRate: totalEvents > 0 ? installs / totalEvents : 0,
      offlineUsage: totalEvents > 0 ? offlineEvents / totalEvents : 0,
      pushNotificationEngagement: notificationReceived > 0 ? notificationClicks / notificationReceived : 0,
      averageSessionDuration: 0, // Would need session tracking
      topDevices: deviceStats.map(stat => ({
        device: stat.device || 'Unknown',
        count: parseInt(stat.count),
      })),
      performanceMetrics: {
        averageLoadTime: parseFloat(performanceData?.avgLoadTime || '0'),
        cacheHitRate: parseFloat(performanceData?.cacheHitRate || '0'),
        networkErrorRate: totalEvents > 0 ? networkErrors / totalEvents : 0,
      },
    };
  }

  async getUserMetrics(userId: string, days = 30): Promise<Record<string, any>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userEvents = await this.analyticsRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    const eventCounts = userEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sessions = new Set(userEvents.map(e => e.sessionId)).size;
    const offlineEvents = userEvents.filter(e => !e.isOnline).length;
    const standaloneEvents = userEvents.filter(e => e.isStandalone).length;

    return {
      totalEvents: userEvents.length,
      uniqueSessions: sessions,
      eventBreakdown: eventCounts,
      offlineUsageRate: userEvents.length > 0 ? offlineEvents / userEvents.length : 0,
      standaloneUsageRate: userEvents.length > 0 ? standaloneEvents / userEvents.length : 0,
      averageEventsPerSession: sessions > 0 ? userEvents.length / sessions : 0,
      period: `${days} days`,
    };
  }

  async getInstallationMetrics(filter: AnalyticsFilter = {}): Promise<Record<string, any>> {
    const query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.eventType = :type', { type: PWAEventType.APP_INSTALL });

    this.applyFilters(query, filter);

    const installations = await query.getMany();

    const byDevice = installations.reduce((acc, install) => {
      const device = install.deviceType || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byBrowser = installations.reduce((acc, install) => {
      const browser = install.browserName || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCountry = installations.reduce((acc, install) => {
      const country = install.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInstallations: installations.length,
      installationsByDevice: byDevice,
      installationsByBrowser: byBrowser,
      installationsByCountry: byCountry,
      averageInstallsPerDay: this.calculateDailyAverage(installations),
    };
  }

  async getOfflineUsageMetrics(filter: AnalyticsFilter = {}): Promise<Record<string, any>> {
    const query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.eventType = :type', { type: PWAEventType.OFFLINE_ACCESS });

    this.applyFilters(query, filter);

    const offlineEvents = await query.getMany();

    const byDataType = offlineEvents.reduce((acc, event) => {
      const dataType = event.eventData?.dataType || 'Unknown';
      acc[dataType] = (acc[dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(offlineEvents.map(e => e.userId)).size;

    return {
      totalOfflineAccess: offlineEvents.length,
      uniqueOfflineUsers: uniqueUsers,
      offlineAccessByDataType: byDataType,
      averageOfflineAccessPerUser: uniqueUsers > 0 ? offlineEvents.length / uniqueUsers : 0,
    };
  }

  async getPerformanceMetrics(filter: AnalyticsFilter = {}): Promise<Record<string, any>> {
    const query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.performanceMetrics IS NOT NULL');

    this.applyFilters(query, filter);

    const performanceData = await query
      .select('AVG((analytics.performanceMetrics->>\'loadTime\')::numeric)', 'avgLoadTime')
      .addSelect('AVG((analytics.performanceMetrics->>\'renderTime\')::numeric)', 'avgRenderTime')
      .addSelect('AVG((analytics.performanceMetrics->>\'cacheHitRate\')::numeric)', 'avgCacheHitRate')
      .addSelect('AVG((analytics.performanceMetrics->>\'memoryUsage\')::numeric)', 'avgMemoryUsage')
      .addSelect('AVG((analytics.performanceMetrics->>\'networkLatency\')::numeric)', 'avgNetworkLatency')
      .getRawOne();

    const cacheHits = await this.analyticsRepository.count({
      where: { eventType: PWAEventType.CACHE_HIT },
    });

    const cacheMisses = await this.analyticsRepository.count({
      where: { eventType: PWAEventType.CACHE_MISS },
    });

    return {
      averageLoadTime: parseFloat(performanceData?.avgLoadTime || '0'),
      averageRenderTime: parseFloat(performanceData?.avgRenderTime || '0'),
      averageCacheHitRate: parseFloat(performanceData?.avgCacheHitRate || '0'),
      averageMemoryUsage: parseFloat(performanceData?.avgMemoryUsage || '0'),
      averageNetworkLatency: parseFloat(performanceData?.avgNetworkLatency || '0'),
      cacheEfficiency: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
    };
  }

  async exportAnalyticsData(
    filter: AnalyticsFilter = {},
    format: 'json' | 'csv' = 'json',
  ): Promise<{ data: any; recordCount: number }> {
    const query = this.analyticsRepository.createQueryBuilder('analytics');
    this.applyFilters(query, filter);

    const data = await query
      .orderBy('analytics.createdAt', 'DESC')
      .limit(10000)
      .getMany();

    if (format === 'csv') {
      const csvData = this.convertToCSV(data);
      return { data: csvData, recordCount: data.length };
    }

    return { data, recordCount: data.length };
  }

  private applyFilters(query: any, filter: AnalyticsFilter): void {
    if (filter.userId) {
      query.andWhere('analytics.userId = :userId', { userId: filter.userId });
    }

    if (filter.eventType) {
      query.andWhere('analytics.eventType = :eventType', { eventType: filter.eventType });
    }

    if (filter.startDate) {
      query.andWhere('analytics.createdAt >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      query.andWhere('analytics.createdAt <= :endDate', { endDate: filter.endDate });
    }

    if (filter.deviceType) {
      query.andWhere('analytics.deviceType = :deviceType', { deviceType: filter.deviceType });
    }

    if (filter.isOnline !== undefined) {
      query.andWhere('analytics.isOnline = :isOnline', { isOnline: filter.isOnline });
    }

    if (filter.isStandalone !== undefined) {
      query.andWhere('analytics.isStandalone = :isStandalone', { isStandalone: filter.isStandalone });
    }
  }

  private calculateDailyAverage(events: PWAAnalytics[]): number {
    if (events.length === 0) return 0;

    const dates = events.map(e => e.createdAt.toDateString());
    const uniqueDates = new Set(dates);
    
    return events.length / uniqueDates.size;
  }

  private convertToCSV(data: PWAAnalytics[]): string {
    if (data.length === 0) return '';

    const headers = [
      'id', 'userId', 'sessionId', 'eventType', 'url', 'deviceType',
      'browserName', 'osName', 'isOnline', 'isStandalone', 'createdAt'
    ];

    const rows = data.map(item => [
      item.id,
      item.userId,
      item.sessionId,
      item.eventType,
      item.url || '',
      item.deviceType || '',
      item.browserName || '',
      item.osName || '',
      item.isOnline,
      item.isStandalone,
      item.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
