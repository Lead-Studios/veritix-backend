export class AnalyticsResponseDto {
  ticketSales: {
    totalSold: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesByTicketType: Array<{
      ticketType: string;
      quantity: number;
      revenue: number;
    }>;
    salesOverTime: Array<{
      date: string;
      quantity: number;
      revenue: number;
    }>;
  };

  trafficSources: Array<{
    source: string;
    views: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }>;

  eventViews: {
    totalViews: number;
    uniqueViews: number;
    viewsOverTime: Array<{
      date: string;
      views: number;
      uniqueViews: number;
    }>;
  };

  conversionMetrics: {
    totalViews: number;
    totalPurchases: number;
    conversionRate: number;
    topPerformingChannels: Array<{
      channel: string;
      views: number;
      purchases: number;
      conversionRate: number;
    }>;
  };

  revenueMetrics: {
    totalRevenue: number;
    netRevenue: number;
    totalDiscounts: number;
    revenueBySource: Array<{
      source: string;
      revenue: number;
      percentage: number;
    }>;
  };
}
