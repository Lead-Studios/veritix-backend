import { Injectable, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Between } from 'typeorm';
import type { EventView } from '../entities/event-view.entity';
import type { PurchaseLog } from '../entities/purchase-log.entity';
import {
  type EventEngagement,
  EngagementType,
} from '../entities/event-engagement.entity';
import type { Event } from '../../ticketing/entities/event.entity';
import type { Refund } from '../../refunds/entities/refund.entity';
import type {
  EventAnalyticsDto,
  AnalyticsFilterDto,
} from '../dto/analytics-response.dto';

@Injectable()
export class EventAnalyticsService {
  constructor(
    private eventViewRepository: Repository<EventView>,
    private purchaseLogRepository: Repository<PurchaseLog>,
    private eventEngagementRepository: Repository<EventEngagement>,
    private eventRepository: Repository<Event>,
    private refundRepository: Repository<Refund>,
  ) {}

  /**
   * Get comprehensive analytics for an event
   */
  async getEventAnalytics(
    eventId: string,
    organizerId: string,
    filters: AnalyticsFilterDto = {},
  ): Promise<EventAnalyticsDto> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    });

    if (!event) {
      throw new ForbiddenException(
        "You don't have permission to view analytics for this event",
      );
    }

    const dateRange = this.getDateRange(filters);

    const [
      salesMetrics,
      trafficMetrics,
      engagementMetrics,
      campaignMetrics,
      demographicMetrics,
      timeAnalysis,
      funnelMetrics,
    ] = await Promise.all([
      this.getSalesMetrics(eventId, dateRange, filters),
      this.getTrafficMetrics(eventId, dateRange, filters),
      this.getEngagementMetrics(eventId, dateRange, filters),
      this.getCampaignMetrics(eventId, dateRange, filters),
      this.getDemographicMetrics(eventId, dateRange, filters),
      this.getTimeAnalysis(eventId, dateRange, filters),
      this.getFunnelMetrics(eventId, dateRange, filters),
    ]);

    return {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.startDate,
      ticketPrice: Number(event.ticketPrice),
      maxCapacity: event.maxCapacity,
      salesMetrics,
      trafficMetrics,
      engagementMetrics,
      campaignMetrics,
      demographicMetrics,
      timeAnalysis,
      funnelMetrics,
    };
  }

  /**
   * Get sales metrics
   */
  private async getSalesMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['salesMetrics']> {
    const baseQuery = this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.createdAt BETWEEN :start AND :end', dateRange);

    if (filters.trafficSource) {
      baseQuery.andWhere('purchase.trafficSource = :trafficSource', {
        trafficSource: filters.trafficSource,
      });
    }

    if (!filters.includeRefunded) {
      baseQuery.andWhere('purchase.status != :refundedStatus', {
        refundedStatus: 'refunded',
      });
    }

    const purchases = await baseQuery.getMany();

    const completedPurchases = purchases.filter(
      (p) => p.status === 'completed',
    );
    const totalTicketsSold = completedPurchases.reduce(
      (sum, p) => sum + p.quantity,
      0,
    );
    const grossRevenue = completedPurchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const discountAmount = completedPurchases.reduce(
      (sum, p) => sum + Number(p.discountAmount || 0),
      0,
    );

    // Get refund amount
    const refunds = await this.refundRepository.find({
      where: { eventId, status: 'processed' },
    });
    const refundAmount = refunds.reduce(
      (sum, r) => sum + Number(r.refundAmount),
      0,
    );
    const netRevenue = grossRevenue - refundAmount;

    const averageOrderValue =
      completedPurchases.length > 0
        ? grossRevenue / completedPurchases.length
        : 0;

    // Get total views for conversion rate
    const totalViews = await this.eventViewRepository.count({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const conversionRate =
      totalViews > 0 ? (completedPurchases.length / totalViews) * 100 : 0;
    const refundRate =
      totalTicketsSold > 0 ? (refunds.length / totalTicketsSold) * 100 : 0;

    // Sales by day
    const salesByDay = await this.getSalesByDay(eventId, dateRange, filters);

    // Sales by hour
    const salesByHour = await this.getSalesByHour(eventId, dateRange, filters);

    return {
      totalTicketsSold,
      totalRevenue: grossRevenue,
      averageOrderValue,
      conversionRate,
      refundRate,
      grossRevenue,
      netRevenue,
      discountAmount,
      salesByDay,
      salesByHour,
    };
  }

  /**
   * Get traffic metrics
   */
  private async getTrafficMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['trafficMetrics']> {
    const baseQuery = this.eventViewRepository
      .createQueryBuilder('view')
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange);

    if (filters.trafficSource) {
      baseQuery.andWhere('view.trafficSource = :trafficSource', {
        trafficSource: filters.trafficSource,
      });
    }

    if (filters.deviceType) {
      baseQuery.andWhere('view.deviceType = :deviceType', {
        deviceType: filters.deviceType,
      });
    }

    if (filters.country) {
      baseQuery.andWhere('view.country = :country', {
        country: filters.country,
      });
    }

    const views = await baseQuery.getMany();

    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map((v) => v.userId || v.ipAddress))
      .size;
    const averageTimeOnPage =
      views.length > 0
        ? views.reduce((sum, v) => sum + v.timeOnPage, 0) / views.length
        : 0;

    // Calculate bounce rate (views with time on page < 30 seconds)
    const bounces = views.filter((v) => v.timeOnPage < 30).length;
    const bounceRate = totalViews > 0 ? (bounces / totalViews) * 100 : 0;

    // Views by source
    const viewsBySource = await this.getViewsBySource(
      eventId,
      dateRange,
      filters,
    );

    // Views by device
    const viewsByDevice = await this.getViewsByDevice(
      eventId,
      dateRange,
      filters,
    );

    // Views by country
    const viewsByCountry = await this.getViewsByCountry(
      eventId,
      dateRange,
      filters,
    );

    // Views by day
    const viewsByDay = await this.getViewsByDay(eventId, dateRange, filters);

    return {
      totalViews,
      uniqueVisitors,
      averageTimeOnPage,
      bounceRate,
      viewsBySource,
      viewsByDevice,
      viewsByCountry,
      viewsByDay,
    };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['engagementMetrics']> {
    const engagements = await this.eventEngagementRepository.find({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const totalEngagements = engagements.length;
    const totalViews = await this.eventViewRepository.count({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const engagementRate =
      totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    // Group by engagement type
    const engagementsByType = Object.values(EngagementType).map((type) => {
      const count = engagements.filter((e) => e.engagementType === type).length;
      return {
        type,
        count,
        percentage: totalEngagements > 0 ? (count / totalEngagements) * 100 : 0,
      };
    });

    const socialShares = engagements.filter(
      (e) => e.engagementType === EngagementType.SHARE,
    ).length;
    const favorites = engagements.filter(
      (e) => e.engagementType === EngagementType.FAVORITE,
    ).length;
    const newsletterSignups = engagements.filter(
      (e) => e.engagementType === EngagementType.NEWSLETTER_SIGNUP,
    ).length;
    const calendarAdds = engagements.filter(
      (e) => e.engagementType === EngagementType.CALENDAR_ADD,
    ).length;

    return {
      totalEngagements,
      engagementRate,
      engagementsByType,
      socialShares,
      favorites,
      newsletterSignups,
      calendarAdds,
    };
  }

  /**
   * Get campaign metrics
   */
  private async getCampaignMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['campaignMetrics']> {
    // Get UTM campaign data from views and purchases
    const viewsWithUTM = await this.eventViewRepository.find({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
      select: ['utmCampaign', 'utmSource', 'utmMedium', 'convertedToPurchase'],
    });

    const purchasesWithUTM = await this.purchaseLogRepository.find({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
        status: 'completed',
      },
      select: ['utmCampaign', 'utmSource', 'utmMedium', 'totalAmount'],
    });

    // Group by campaign
    const campaignMap = new Map();

    viewsWithUTM.forEach((view) => {
      if (view.utmCampaign) {
        const key = `${view.utmCampaign}-${view.utmSource}-${view.utmMedium}`;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaign: view.utmCampaign,
            source: view.utmSource,
            medium: view.utmMedium,
            views: 0,
            conversions: 0,
            revenue: 0,
          });
        }
        const campaign = campaignMap.get(key);
        campaign.views++;
        if (view.convertedToPurchase) {
          campaign.conversions++;
        }
      }
    });

    purchasesWithUTM.forEach((purchase) => {
      if (purchase.utmCampaign) {
        const key = `${purchase.utmCampaign}-${purchase.utmSource}-${purchase.utmMedium}`;
        if (campaignMap.has(key)) {
          const campaign = campaignMap.get(key);
          campaign.revenue += Number(purchase.totalAmount);
        }
      }
    });

    const utmCampaigns = Array.from(campaignMap.values()).map((campaign) => ({
      ...campaign,
      roi: campaign.views > 0 ? (campaign.revenue / campaign.views) * 100 : 0,
    }));

    const topPerformingCampaigns = utmCampaigns
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((campaign) => ({
        campaign: campaign.campaign,
        conversions: campaign.conversions,
        revenue: campaign.revenue,
        conversionRate:
          campaign.views > 0
            ? (campaign.conversions / campaign.views) * 100
            : 0,
      }));

    return {
      utmCampaigns,
      topPerformingCampaigns,
    };
  }

  /**
   * Get demographic metrics
   */
  private async getDemographicMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['demographicMetrics']> {
    // Top countries
    const countryViews = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.country', 'country')
      .addSelect('COUNT(*)', 'visitors')
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('view.country IS NOT NULL')
      .groupBy('view.country')
      .orderBy('visitors', 'DESC')
      .limit(10)
      .getRawMany();

    const countryPurchases = await this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('purchase.country', 'country')
      .addSelect('COUNT(*)', 'purchases')
      .addSelect('SUM(purchase.totalAmount)', 'revenue')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('purchase.status = :status', { status: 'completed' })
      .andWhere('purchase.country IS NOT NULL')
      .groupBy('purchase.country')
      .getRawMany();

    const topCountries = countryViews.map((cv) => {
      const purchase = countryPurchases.find((cp) => cp.country === cv.country);
      return {
        country: cv.country,
        visitors: Number(cv.visitors),
        purchases: purchase ? Number(purchase.purchases) : 0,
        revenue: purchase ? Number(purchase.revenue) : 0,
      };
    });

    // Similar logic for cities and devices
    const topCities = await this.getTopCities(eventId, dateRange);
    const deviceBreakdown = await this.getDeviceBreakdown(eventId, dateRange);

    return {
      topCountries,
      topCities,
      deviceBreakdown,
    };
  }

  /**
   * Get time-based analysis
   */
  private async getTimeAnalysis(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['timeAnalysis']> {
    // Peak viewing hours
    const peakViewingHours = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('EXTRACT(HOUR FROM view.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'views')
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .groupBy('EXTRACT(HOUR FROM view.createdAt)')
      .orderBy('views', 'DESC')
      .getRawMany();

    // Peak purchase hours
    const peakPurchaseHours = await this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('EXTRACT(HOUR FROM purchase.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'purchases')
      .addSelect('SUM(purchase.totalAmount)', 'revenue')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('purchase.status = :status', { status: 'completed' })
      .groupBy('EXTRACT(HOUR FROM purchase.createdAt)')
      .orderBy('purchases', 'DESC')
      .getRawMany();

    // Sales velocity (cumulative over time)
    const salesVelocity = await this.getSalesVelocity(eventId, dateRange);

    return {
      peakViewingHours: peakViewingHours.map((p) => ({
        hour: Number(p.hour),
        views: Number(p.views),
      })),
      peakPurchaseHours: peakPurchaseHours.map((p) => ({
        hour: Number(p.hour),
        purchases: Number(p.purchases),
        revenue: Number(p.revenue),
      })),
      salesVelocity,
    };
  }

  /**
   * Get funnel metrics
   */
  private async getFunnelMetrics(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<EventAnalyticsDto['funnelMetrics']> {
    const totalViews = await this.eventViewRepository.count({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const ticketViews = await this.eventEngagementRepository.count({
      where: {
        eventId,
        engagementType: EngagementType.TICKET_VIEW,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const purchases = await this.purchaseLogRepository.count({
      where: {
        eventId,
        status: 'completed',
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const viewToTicketView =
      totalViews > 0 ? (ticketViews / totalViews) * 100 : 0;
    const ticketViewToPurchase =
      ticketViews > 0 ? (purchases / ticketViews) * 100 : 0;
    const overallConversion =
      totalViews > 0 ? (purchases / totalViews) * 100 : 0;

    const dropOffPoints = [
      {
        stage: 'Event Page to Ticket View',
        dropOffRate: 100 - viewToTicketView,
        suggestions: [
          'Improve event description and visuals',
          'Add social proof and testimonials',
          'Optimize page loading speed',
        ],
      },
      {
        stage: 'Ticket View to Purchase',
        dropOffRate: 100 - ticketViewToPurchase,
        suggestions: [
          'Simplify checkout process',
          'Add multiple payment options',
          'Display security badges',
          'Offer limited-time discounts',
        ],
      },
    ];

    return {
      viewToTicketView,
      ticketViewToPurchase,
      overallConversion,
      dropOffPoints,
    };
  }

  // Helper methods for detailed breakdowns
  private async getSalesByDay(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<Array<{ date: string; tickets: number; revenue: number }>> {
    const sales = await this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('DATE(purchase.createdAt)', 'date')
      .addSelect('SUM(purchase.quantity)', 'tickets')
      .addSelect('SUM(purchase.totalAmount)', 'revenue')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('purchase.status = :status', { status: 'completed' })
      .groupBy('DATE(purchase.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return sales.map((s) => ({
      date: s.date,
      tickets: Number(s.tickets),
      revenue: Number(s.revenue),
    }));
  }

  private async getSalesByHour(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<Array<{ hour: number; tickets: number; revenue: number }>> {
    const sales = await this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('EXTRACT(HOUR FROM purchase.createdAt)', 'hour')
      .addSelect('SUM(purchase.quantity)', 'tickets')
      .addSelect('SUM(purchase.totalAmount)', 'revenue')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('purchase.status = :status', { status: 'completed' })
      .groupBy('EXTRACT(HOUR FROM purchase.createdAt)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    return sales.map((s) => ({
      hour: Number(s.hour),
      tickets: Number(s.tickets),
      revenue: Number(s.revenue),
    }));
  }

  private async getViewsBySource(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<
    Array<{
      source: string;
      views: number;
      uniqueVisitors: number;
      conversions: number;
      conversionRate: number;
    }>
  > {
    const viewsBySource = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.trafficSource', 'source')
      .addSelect('COUNT(*)', 'views')
      .addSelect(
        'COUNT(DISTINCT COALESCE(view.userId, view.ipAddress))',
        'uniqueVisitors',
      )
      .addSelect(
        'SUM(CASE WHEN view.convertedToPurchase THEN 1 ELSE 0 END)',
        'conversions',
      )
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .groupBy('view.trafficSource')
      .orderBy('views', 'DESC')
      .getRawMany();

    return viewsBySource.map((vs) => ({
      source: vs.source || 'unknown',
      views: Number(vs.views),
      uniqueVisitors: Number(vs.uniqueVisitors),
      conversions: Number(vs.conversions),
      conversionRate:
        Number(vs.views) > 0
          ? (Number(vs.conversions) / Number(vs.views)) * 100
          : 0,
    }));
  }

  private async getViewsByDevice(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<Array<{ device: string; views: number; percentage: number }>> {
    const totalViews = await this.eventViewRepository.count({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const viewsByDevice = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.deviceType', 'device')
      .addSelect('COUNT(*)', 'views')
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .groupBy('view.deviceType')
      .orderBy('views', 'DESC')
      .getRawMany();

    return viewsByDevice.map((vd) => ({
      device: vd.device || 'unknown',
      views: Number(vd.views),
      percentage: totalViews > 0 ? (Number(vd.views) / totalViews) * 100 : 0,
    }));
  }

  private async getViewsByCountry(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<Array<{ country: string; views: number; percentage: number }>> {
    const totalViews = await this.eventViewRepository.count({
      where: {
        eventId,
        createdAt: Between(dateRange.start, dateRange.end),
      },
    });

    const viewsByCountry = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.country', 'country')
      .addSelect('COUNT(*)', 'views')
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .andWhere('view.country IS NOT NULL')
      .groupBy('view.country')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();

    return viewsByCountry.map((vc) => ({
      country: vc.country,
      views: Number(vc.views),
      percentage: totalViews > 0 ? (Number(vc.views) / totalViews) * 100 : 0,
    }));
  }

  private async getViewsByDay(
    eventId: string,
    dateRange: { start: Date; end: Date },
    filters: AnalyticsFilterDto,
  ): Promise<Array<{ date: string; views: number; uniqueVisitors: number }>> {
    const viewsByDay = await this.eventViewRepository
      .createQueryBuilder('view')
      .select('DATE(view.createdAt)', 'date')
      .addSelect('COUNT(*)', 'views')
      .addSelect(
        'COUNT(DISTINCT COALESCE(view.userId, view.ipAddress))',
        'uniqueVisitors',
      )
      .where('view.eventId = :eventId', { eventId })
      .andWhere('view.createdAt BETWEEN :start AND :end', dateRange)
      .groupBy('DATE(view.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return viewsByDay.map((vd) => ({
      date: vd.date,
      views: Number(vd.views),
      uniqueVisitors: Number(vd.uniqueVisitors),
    }));
  }

  private async getTopCities(
    eventId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<
    Array<{
      city: string;
      visitors: number;
      purchases: number;
      revenue: number;
    }>
  > {
    // Similar implementation to getTopCountries but for cities
    return [];
  }

  private async getDeviceBreakdown(
    eventId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<
    Array<{
      device: string;
      visitors: number;
      purchases: number;
      conversionRate: number;
    }>
  > {
    // Implementation for device breakdown with conversion rates
    return [];
  }

  private async getSalesVelocity(
    eventId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<
    Array<{
      date: string;
      cumulativeTickets: number;
      cumulativeRevenue: number;
    }>
  > {
    // Implementation for cumulative sales over time
    return [];
  }

  private getDateRange(filters: AnalyticsFilterDto): {
    start: Date;
    end: Date;
  } {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return { start, end };
  }
}
