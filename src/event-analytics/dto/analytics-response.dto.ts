import { IsOptional } from "class-validator"

export class EventAnalyticsDto {
  // Basic Event Info
  eventId: string
  eventName: string
  eventDate: Date
  ticketPrice: number
  maxCapacity: number

  // Sales Metrics
  salesMetrics: {
    totalTicketsSold: number
    totalRevenue: number
    averageOrderValue: number
    conversionRate: number
    refundRate: number
    grossRevenue: number
    netRevenue: number
    discountAmount: number
    salesByDay: Array<{
      date: string
      tickets: number
      revenue: number
    }>
    salesByHour: Array<{
      hour: number
      tickets: number
      revenue: number
    }>
  }

  // Traffic Metrics
  trafficMetrics: {
    totalViews: number
    uniqueVisitors: number
    averageTimeOnPage: number
    bounceRate: number
    viewsBySource: Array<{
      source: string
      views: number
      uniqueVisitors: number
      conversions: number
      conversionRate: number
    }>
    viewsByDevice: Array<{
      device: string
      views: number
      percentage: number
    }>
    viewsByCountry: Array<{
      country: string
      views: number
      percentage: number
    }>
    viewsByDay: Array<{
      date: string
      views: number
      uniqueVisitors: number
    }>
  }

  // Engagement Metrics
  engagementMetrics: {
    totalEngagements: number
    engagementRate: number
    engagementsByType: Array<{
      type: string
      count: number
      percentage: number
    }>
    socialShares: number
    favorites: number
    newsletterSignups: number
    calendarAdds: number
  }

  // Campaign Performance
  campaignMetrics: {
    utmCampaigns: Array<{
      campaign: string
      source: string
      medium: string
      views: number
      conversions: number
      revenue: number
      roi: number
    }>
    topPerformingCampaigns: Array<{
      campaign: string
      conversions: number
      revenue: number
      conversionRate: number
    }>
  }

  // Demographic Insights
  demographicMetrics: {
    topCountries: Array<{
      country: string
      visitors: number
      purchases: number
      revenue: number
    }>
    topCities: Array<{
      city: string
      visitors: number
      purchases: number
      revenue: number
    }>
    deviceBreakdown: Array<{
      device: string
      visitors: number
      purchases: number
      conversionRate: number
    }>
  }

  // Time-based Analysis
  timeAnalysis: {
    peakViewingHours: Array<{
      hour: number
      views: number
    }>
    peakPurchaseHours: Array<{
      hour: number
      purchases: number
      revenue: number
    }>
    salesVelocity: Array<{
      date: string
      cumulativeTickets: number
      cumulativeRevenue: number
    }>
  }

  // Funnel Analysis
  funnelMetrics: {
    viewToTicketView: number
    ticketViewToPurchase: number
    overallConversion: number
    dropOffPoints: Array<{
      stage: string
      dropOffRate: number
      suggestions: string[]
    }>
  }
}

export class AnalyticsFilterDto {
  @IsOptional()
  startDate?: string

  @IsOptional()
  endDate?: string

  @IsOptional()
  trafficSource?: string

  @IsOptional()
  deviceType?: string

  @IsOptional()
  country?: string

  @IsOptional()
  includeRefunded?: boolean
}
