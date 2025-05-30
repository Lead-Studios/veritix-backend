import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventView } from './entities/event-view.entity';
import { PurchaseLog } from './entities/purchase-log.entity';
import { Event } from './entities/event.entity';
import { AnalyticsQueryDto, TimeRangeEnum } from './dto/analytics-query.dto';
import { EventAnalyticsResponse, TicketSalesAnalytics, TrafficAnalytics } from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(EventView)
    private eventViewRepository: Repository<EventView>,
    @InjectRepository(PurchaseLog)
    private purchaseLogRepository: Repository<PurchaseLog>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.timeRange === TimeRangeEnum.CUSTOM && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.timeRange) {
        case TimeRangeEnum.LAST_7_DAYS:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case TimeRangeEnum.LAST_90_DAYS:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // LAST_30_DAYS
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  }

  async getEventAnalytics(eventId: string, query: AnalyticsQueryDto): Promise<EventAnalyticsResponse> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new Error('Event not found');
    }

    const { startDate, endDate } = this.getDateRange(query);

    const [ticketSales, traffic] = await Promise.all([
      this.getTicketSalesAnalytics(eventId, startDate, endDate, query.includeRefunds),
      this.getTrafficAnalytics(eventId, startDate, endDate),
    ]);

    const conversionRate = traffic.uniqueViews > 0 ? (ticketSales.totalTicketsSold / traffic.uniqueViews) * 100 : 0;

    const [peakTrafficHours, salesOverTime] = await Promise.all([
      this.getPeakTrafficHours(eventId, startDate, endDate),
      this.getSalesOverTime(eventId, startDate, endDate),
    ]);

    return {
      eventId,
      eventName: event.eventName,
      timeRange: { startDate, endDate },
      ticketSales,
      traffic,
      conversionRate: Math.round(conversionRate * 100) / 100,
      peakTrafficHours,
      salesOverTime,
    };
  }

  private async getTicketSalesAnalytics(
    eventId: string,
    startDate: Date,
    endDate: Date,
    includeRefunds: boolean = false,
  ): Promise<TicketSalesAnalytics> {
    const whereCondition = {
      eventId,
      purchasedAt: Between(startDate, endDate),
      ...(includeRefunds ? {} : { status: 'completed' }),
    };

    const purchases = await this.purchaseLogRepository.find({
      where: whereCondition,
    });

    const totalTicketsSold = purchases.length;
    const ticketsSoldByType = purchases.reduce((acc, purchase) => {
      acc[purchase.ticketType] = (acc[purchase.ticketType] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const totalRevenue = purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
    const netRevenue = purchases.reduce((sum, purchase) => sum + Number(purchase.netAmount), 0);
    const processingFeesTotal = purchases.reduce((sum, purchase) => sum + Number(purchase.processingFee), 0);
    const refundedAmount = purchases
      .filter(p => p.status === 'refunded')
      .reduce((sum, purchase) => sum + Number(purchase.amount), 0);

    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    return {
      totalTicketsSold,
      ticketsSoldByType,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      averageTicketPrice: Math.round(averageTicketPrice * 100) / 100,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      processingFeesTotal: Math.round(processingFeesTotal * 100) / 100,
    };
  }

  private async getTrafficAnalytics(eventId: string, startDate: Date, endDate: Date): Promise<TrafficAnalytics> {
    const views = await this.eventViewRepository.find({
      where: {
        eventId,
        viewedAt: Between(startDate, endDate),
      },
    });

    const totalViews = views.length;
    const uniqueViews = new Set(views.map(view => view.userId || view.ipAddress)).size;

    const viewsBySource = views.reduce((acc, view) => {
      const source = view.trafficSource || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const referrerCounts = views
      .filter(view => view.referrer)
      .reduce((acc, view) => {
        acc[view.referrer] = (acc[view.referrer] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

    const topReferrers = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    // Group views by date for timeline
    const viewsOverTime = this.groupViewsByDate(views);

    return {
      totalViews,
      uniqueViews,
      viewsBySource,
      topReferrers,
      viewsOverTime,
    };
  }

  private async getPeakTrafficHours(eventId: string, startDate: Date, endDate: Date) {
    const views = await this.eventViewRepository.find({
      where: {
        eventId,
        viewedAt: Between(startDate, endDate),
      },
    });

    const hourCounts = views.reduce((acc, view) => {
      const hour = new Date(view.viewedAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    return Object.entries(hourCounts)
      .map(([hour, views]) => ({ hour: parseInt(hour), views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }

  private async getSalesOverTime(eventId: string, startDate: Date, endDate: Date) {
    const purchases = await this.purchaseLogRepository.find({
      where: {
        eventId,
        purchasedAt: Between(startDate, endDate),
        status: 'completed',
      },
    });

    const salesByDate = purchases.reduce((acc, purchase) => {
      const date = purchase.purchasedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sales: 0, revenue: 0 };
      }
      acc[date].sales += 1;
      acc[date].revenue += Number(purchase.amount);
      return acc;
    }, {} as { [key: string]: { sales: number; revenue: number } });

    return Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupViewsByDate(views: EventView[]) {
    const viewsByDate = views.reduce((acc, view) => {
      const date = view.viewedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(viewsByDate)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Method to track event views (call this when someone views an event)
  async trackEventView(eventId: string, userId?: string, ipAddress?: string, userAgent?: string, referrer?: string) {
    const trafficSource = this.determineTrafficSource(referrer);
    
    const eventView = this.eventViewRepository.create({
      eventId,
      userId,
      ipAddress,
      userAgent,
      referrer,
      trafficSource,
    });

    return this.eventViewRepository.save(eventView);
  }

  // Method to log purchases (call this when a ticket is purchased)
  async logPurchase(
    eventId: string,
    userId: string,
    ticketId: string,
    ticketType: string,
    amount: number,
    paymentMethod?: string,
    discountApplied: number = 0,
    processingFee: number = 0,
  ) {
    const netAmount = amount - discountApplied - processingFee;

    const purchaseLog = this.purchaseLogRepository.create({
      eventId,
      userId,
      ticketId,
      ticketType,
      amount,
      paymentMethod,
      discountApplied,
      processingFee,
      netAmount,
      status: 'completed',
    });

    return this.purchaseLogRepository.save(purchaseLog);
  }

  private determineTrafficSource(referrer?: string): string {
    if (!referrer) return 'direct';
    
    const url = referrer.toLowerCase();
    
    if (url.includes('google.com') || url.includes('bing.com') || url.includes('yahoo.com')) {
      return 'search';
    }
    if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('instagram.com') || url.includes('linkedin.com')) {
      return 'social';
    }
    if (url.includes('gmail.com') || url.includes('outlook.com') || url.includes('mail')) {
      return 'email';
    }
    
    return 'referral';
  }
}