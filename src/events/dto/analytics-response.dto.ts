export class TicketSalesAnalytics {
  totalTicketsSold: number;
  ticketsSoldByType: { [key: string]: number };
  totalRevenue: number;
  netRevenue: number;
  averageTicketPrice: number;
  refundedAmount: number;
  processingFeesTotal: number;
}

export class TrafficAnalytics {
  totalViews: number;
  uniqueViews: number;
  viewsBySource: { [key: string]: number };
  topReferrers: { referrer: string; count: number }[];
  viewsOverTime: { date: string; views: number }[];
}

export class EventAnalyticsResponse {
  eventId: string;
  eventName: string;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  ticketSales: TicketSalesAnalytics;
  traffic: TrafficAnalytics;
  conversionRate: number; // views to purchases ratio
  peakTrafficHours: { hour: number; views: number }[];
  salesOverTime: { date: string; sales: number; revenue: number }[];
}
