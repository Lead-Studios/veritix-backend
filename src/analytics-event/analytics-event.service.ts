/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { EventView } from './entities/event-view.entity';
import { PurchaseLog } from './entities/purchase-log.entity';
import { Event } from '../event/entities/event.entity';

@Injectable()
export class AnalyticsEventService {
  constructor(
    @InjectRepository(EventView)
    private eventViewRepository: Repository<EventView>,
    @InjectRepository(PurchaseLog)
    private purchaseLogRepository: Repository<PurchaseLog>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async getEventAnalytics(
    eventId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsResponseDto> {
    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const dateFilter = this.getDateFilter(startDate, endDate);

    // Get all required data in parallel
    const [
      ticketSalesData,
      trafficSourcesData,
      eventViewsData,
      conversionData,
      revenueData,
    ] = await Promise.all([
      this.getTicketSalesData(eventId, dateFilter),
      this.getTrafficSourcesData(eventId, dateFilter),
      this.getEventViewsData(eventId, dateFilter),
      this.getConversionData(eventId, dateFilter),
      this.getRevenueData(eventId, dateFilter),
    ]);

    return {
      ticketSales: ticketSalesData,
      trafficSources: trafficSourcesData,
      eventViews: eventViewsData,
      conversionMetrics: conversionData,
      revenueMetrics: revenueData,
    };
  }

  private getDateFilter(startDate?: Date, endDate?: Date) {
    if (startDate && endDate) {
      return { moreThan: startDate, lessThan: endDate };
    }
    return undefined;
  }

  private async getTicketSalesData(eventId: string, dateFilter: any) {
    const whereCondition = dateFilter
      ? { eventId, createdAt: dateFilter, status: 'completed' as const }
      : { eventId, status: 'completed' as const };

    const purchases = await this.purchaseLogRepository.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });

    const totalSold = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalRevenue = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const averageOrderValue =
      purchases.length > 0 ? totalRevenue / purchases.length : 0;

    // Sales by ticket type
    const salesByTicketType = purchases.reduce<
      { ticketType: string; quantity: number; revenue: number }[]
    >((acc, purchase) => {
      const existing = acc.find(
        (item) => item.ticketType === purchase.ticketType,
      );
      if (existing) {
        existing.quantity += purchase.quantity;
        existing.revenue += Number(purchase.totalAmount);
      } else {
        acc.push({
          ticketType: purchase.ticketType,
          quantity: purchase.quantity,
          revenue: Number(purchase.totalAmount),
        });
      }
      return acc;
    }, []);

    // Sales over time (daily aggregation)
    const salesOverTime = this.aggregateByDate(
      purchases,
      'totalAmount',
      'quantity',
    );

    return {
      totalSold,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      salesByTicketType,
      salesOverTime,
    };
  }

  private async getTrafficSourcesData(eventId: string, dateFilter: any) {
    const viewsQuery = this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.trafficSource', 'source')
      .addSelect('COUNT(*)', 'views')
      .where('view.eventId = :eventId', { eventId })
      .groupBy('view.trafficSource');

    const purchasesQuery = this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('purchase.trafficSource', 'source')
      .addSelect('COUNT(*)', 'conversions')
      .addSelect('SUM(purchase.totalAmount)', 'revenue')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .groupBy('purchase.trafficSource');

    if (dateFilter) {
      viewsQuery.andWhere('view.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateFilter.moreThan,
        endDate: dateFilter.lessThan,
      });
      purchasesQuery.andWhere(
        'purchase.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: dateFilter.moreThan,
          endDate: dateFilter.lessThan,
        },
      );
    }

    const [viewsData, purchasesData] = await Promise.all([
      viewsQuery.getRawMany(),
      purchasesQuery.getRawMany(),
    ]);

    // Merge views and purchases data
    const trafficSources = viewsData.map((view) => {
      const purchase = purchasesData.find((p) => p.source === view.source);
      const conversions = purchase ? parseInt(purchase.conversions) : 0;
      const revenue = purchase ? parseFloat(purchase.revenue) : 0;
      const views = parseInt(view.views);
      const conversionRate = views > 0 ? (conversions / views) * 100 : 0;

      return {
        source: view.source || 'direct',
        views,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
      };
    });

    return trafficSources.sort((a, b) => b.views - a.views);
  }

  private async getEventViewsData(eventId: string, dateFilter: any) {
    const whereCondition = dateFilter
      ? { eventId, createdAt: dateFilter }
      : { eventId };

    const views = await this.eventViewRepository.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });

    const totalViews = views.length;
    const uniqueViews = new Set(
      views.map((v) => v.userId || v.sessionId || v.ipAddress),
    ).size;

    // Views over time (daily aggregation)
    const viewsOverTime = this.aggregateViewsByDate(views);

    return {
      totalViews,
      uniqueViews,
      viewsOverTime,
    };
  }

  private async getConversionData(eventId: string, dateFilter: any) {
    const whereCondition = dateFilter
      ? { eventId, createdAt: dateFilter }
      : { eventId };

    const [totalViews, purchases] = await Promise.all([
      this.eventViewRepository.count({ where: whereCondition }),
      this.purchaseLogRepository.find({
        where: { ...whereCondition, status: 'completed' },
      }),
    ]);

    const totalPurchases = purchases.length;
    const conversionRate =
      totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

    // Top performing channels
    const channelData = await this.getChannelPerformanceData(
      eventId,
      dateFilter,
    );

    return {
      totalViews,
      totalPurchases,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingChannels: channelData,
    };
  }

  private async getRevenueData(eventId: string, dateFilter: any) {
    const whereCondition = dateFilter
      ? { eventId, createdAt: dateFilter, status: 'completed' }
      : { eventId, status: 'completed' };

    const purchases = await this.purchaseLogRepository.find({
      where: whereCondition,
    });

    const totalRevenue = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const totalDiscounts = purchases.reduce(
      (sum, p) => sum + Number(p.discountAmount),
      0,
    );
    const netRevenue = totalRevenue - totalDiscounts;

    // Revenue by source
    const revenueBySource = purchases.reduce<
      { source: string; revenue: number; percentage: number }[]
    >((acc, purchase) => {
      const source = purchase.trafficSource || 'direct';
      const existing = acc.find((item) => item.source === source);
      if (existing) {
        existing.revenue += Number(purchase.totalAmount);
      } else {
        acc.push({
          source,
          revenue: Number(purchase.totalAmount),
          percentage: 0,
        });
      }
      return acc;
    }, []);

    // Calculate percentages
    revenueBySource.forEach((item) => {
      item.percentage =
        totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
      item.revenue = Math.round(item.revenue * 100) / 100;
      item.percentage = Math.round(item.percentage * 100) / 100;
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      revenueBySource: revenueBySource.sort((a, b) => b.revenue - a.revenue),
    };
  }

  private async getChannelPerformanceData(eventId: string, dateFilter: any) {
    const viewsQuery = this.eventViewRepository
      .createQueryBuilder('view')
      .select('view.trafficSource', 'channel')
      .addSelect('COUNT(*)', 'views')
      .where('view.eventId = :eventId', { eventId })
      .groupBy('view.trafficSource');

    const purchasesQuery = this.purchaseLogRepository
      .createQueryBuilder('purchase')
      .select('purchase.trafficSource', 'channel')
      .addSelect('COUNT(*)', 'purchases')
      .where('purchase.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .groupBy('purchase.trafficSource');

    if (dateFilter) {
      viewsQuery.andWhere('view.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateFilter.moreThan,
        endDate: dateFilter.lessThan,
      });
      purchasesQuery.andWhere(
        'purchase.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: dateFilter.moreThan,
          endDate: dateFilter.lessThan,
        },
      );
    }

    const [viewsData, purchasesData] = await Promise.all([
      viewsQuery.getRawMany(),
      purchasesQuery.getRawMany(),
    ]);

    const channels = viewsData.map((view) => {
      const purchase = purchasesData.find((p) => p.channel === view.channel);
      const purchases = purchase ? parseInt(purchase.purchases) : 0;
      const views = parseInt(view.views);
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

      return {
        channel: view.channel || 'direct',
        views,
        purchases,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });

    return channels
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);
  }

  private aggregateByDate(
    items: any[],
    revenueField: string,
    quantityField: string,
  ) {
    const dateMap = new Map();

    items.forEach((item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      const existing = dateMap.get(date) || { date, quantity: 0, revenue: 0 };
      existing.quantity += item[quantityField];
      existing.revenue += Number(item[revenueField]);
      dateMap.set(date, existing);
    });

    return Array.from(dateMap.values()).map((item) => ({
      ...item,
      revenue: Math.round(item.revenue * 100) / 100,
    }));
  }

  private aggregateViewsByDate(views: EventView[]) {
    const dateMap = new Map();

    views.forEach((view) => {
      const date = view.createdAt.toISOString().split('T')[0];
      type DateMapValue = {
        date: string;
        views: number;
        uniqueViews: Set<string | undefined>;
      };
      const existing: DateMapValue = dateMap.get(date) || {
        date,
        views: 0,
        uniqueViews: new Set<string | undefined>(),
      };
      existing.views += 1;
      existing.uniqueViews.add(view.userId || view.sessionId || view.ipAddress);
      dateMap.set(date, existing);
    });

    return Array.from(dateMap.values()).map((item) => ({
      date: item.date,
      views: item.views,
      uniqueViews: item.uniqueViews.size,
    }));
  }

  // Helper methods for tracking
  async trackEventView(
    eventId: string,
    trackingData: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      trafficSource?: string;
      referrerUrl?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    },
  ) {
    const eventView = this.eventViewRepository.create({
      eventId,
      ...trackingData,
    });

    return this.eventViewRepository.save(eventView);
  }

  async trackPurchase(
    eventId: string,
    purchaseData: {
      userId: string;
      ticketType: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      discountCode?: string;
      discountAmount?: number;
      trafficSource?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    },
  ) {
    const purchaseLog = this.purchaseLogRepository.create({
      eventId,
      ...purchaseData,
    });

    return this.purchaseLogRepository.save(purchaseLog);
  }
}
