import { Injectable } from '@nestjs/common';
import { WeeklyReportData } from './weekly-report.service';

@Injectable()
export class ReportGeneratorService {
  async generateWeeklyReport(organizerId: string): Promise<WeeklyReportData> {
    const weekPeriod = this.getLastWeekPeriod();

    // Fetch data from your database
    const ticketSalesData = await this.getTicketSalesData(
      organizerId,
      weekPeriod,
    );
    const viewsData = await this.getEventViewsData(organizerId, weekPeriod);
    const organizerInfo = await this.getOrganizerInfo(organizerId);

    const performanceMetrics = this.calculatePerformanceMetrics(
      ticketSalesData,
      viewsData,
    );

    return {
      organizerId,
      organizerName: organizerInfo.name,
      organizerEmail: organizerInfo.email,
      weekPeriod,
      ticketSales: ticketSalesData,
      eventViews: viewsData,
      performanceMetrics,
    };
  }

  private getLastWeekPeriod(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days ago
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }

  private async getTicketSalesData(
    organizerId: string,
    period: { startDate: Date; endDate: Date },
  ) {
    // Replace with actual database queries
    // Example implementation:
    return {
      totalSold: 150,
      totalRevenue: 7500,
      salesByEvent: [
        {
          eventId: 'event1',
          eventName: 'Summer Music Festival',
          ticketsSold: 100,
          revenue: 5000,
        },
        {
          eventId: 'event2',
          eventName: 'Tech Conference 2024',
          ticketsSold: 50,
          revenue: 2500,
        },
      ],
    };
  }

  private async getEventViewsData(
    organizerId: string,
    period: { startDate: Date; endDate: Date },
  ) {
    // Replace with actual database queries
    return {
      totalViews: 2500,
      viewsByEvent: [
        {
          eventId: 'event1',
          eventName: 'Summer Music Festival',
          views: 1800,
        },
        {
          eventId: 'event2',
          eventName: 'Tech Conference 2024',
          views: 700,
        },
      ],
    };
  }

  private async getOrganizerInfo(organizerId: string) {
    // Replace with actual database query
    return {
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  private calculatePerformanceMetrics(ticketSales: any, views: any) {
    const conversionRate = (ticketSales.totalSold / views.totalViews) * 100;
    const averageTicketPrice = ticketSales.totalRevenue / ticketSales.totalSold;
    const topPerformingEvent =
      ticketSales.salesByEvent.sort((a, b) => b.revenue - a.revenue)[0]
        ?.eventName || 'N/A';

    return {
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageTicketPrice: Math.round(averageTicketPrice * 100) / 100,
      topPerformingEvent,
    };
  }
}
