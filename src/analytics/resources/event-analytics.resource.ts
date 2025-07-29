export class EventAnalyticsResource {
  static revenueResponse(revenue: number, filter?: string) {
    return {
      revenue,
      filter: filter || 'all',
    };
  }

  static profitResponse(profit: number, filter?: string) {
    return {
      profit,
      filter: filter || 'all',
    };
  }
}
