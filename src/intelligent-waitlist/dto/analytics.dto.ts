import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsArray, IsObject, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { AnalyticsPeriod } from '../entities/waitlist-analytics.entity';

// Dashboard Overview DTOs

export class WaitlistOverviewDto {
  @ApiProperty({ description: 'Total users on waitlist' })
  totalWaitlisted: number;

  @ApiProperty({ description: 'Active waitlist entries' })
  activeWaitlisted: number;

  @ApiProperty({ description: 'Total converted users' })
  totalConverted: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Average wait time in hours' })
  averageWaitTime: number;

  @ApiProperty({ description: 'Peak waitlist size' })
  peakWaitlistSize: number;

  @ApiProperty({ description: 'Current position distribution' })
  currentPositions: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export class ConversionFunnelDto {
  @ApiProperty({ description: 'Funnel stages with counts and percentages' })
  stages: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Major dropoff points' })
  dropoffPoints: Array<{
    fromStage: string;
    toStage: string;
    dropoffRate: number;
    impact: 'high' | 'medium' | 'low';
  }>;

  @ApiProperty({ description: 'Optimization suggestions' })
  optimizationSuggestions: string[];
}

export class PriorityBreakdownDto {
  @ApiProperty({ description: 'VIP tier statistics' })
  vip: {
    total: number;
    converted: number;
    conversionRate: number;
    averageWaitTime: number;
  };

  @ApiProperty({ description: 'Premium tier statistics' })
  premium: {
    total: number;
    converted: number;
    conversionRate: number;
    averageWaitTime: number;
  };

  @ApiProperty({ description: 'Standard tier statistics' })
  standard: {
    total: number;
    converted: number;
    conversionRate: number;
    averageWaitTime: number;
  };
}

export class NotificationMetricsDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalSent: number;

  @ApiProperty({ description: 'Delivery rate percentage' })
  deliveryRate: number;

  @ApiProperty({ description: 'Open rate percentage' })
  openRate: number;

  @ApiProperty({ description: 'Click rate percentage' })
  clickRate: number;

  @ApiProperty({ description: 'Response rate percentage' })
  responseRate: number;

  @ApiProperty({ description: 'Performance by channel' })
  channelPerformance: {
    [channel: string]: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      deliveryRate: number;
      openRate: number;
      clickRate: number;
    };
  };
}

export class DemandInsightsDto {
  @ApiProperty({ description: 'Peak join times analysis' })
  peakJoinTimes: Array<{
    hour: number;
    dayOfWeek: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Popular seat preferences' })
  popularSeatPreferences: Array<{
    preference: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Price willingness distribution' })
  priceWillingnessDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
    averageConversionRate: number;
  }>;

  @ApiProperty({ description: 'Geographic distribution' })
  geographicDistribution: Array<{
    region: string;
    count: number;
    percentage: number;
    conversionRate: number;
  }>;

  @ApiProperty({ description: 'Device breakdown' })
  deviceBreakdown: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
}

export class RevenueImpactDto {
  @ApiProperty({ description: 'Total revenue generated from waitlist' })
  totalRevenueGenerated: number;

  @ApiProperty({ description: 'Average ticket price' })
  averageTicketPrice: number;

  @ApiProperty({ description: 'Potential revenue lost from non-conversions' })
  potentialRevenueLost: number;

  @ApiProperty({ description: 'Revenue breakdown by priority tier' })
  revenueByPriority: {
    [priority: string]: {
      revenue: number;
      ticketsSold: number;
      averagePrice: number;
      conversionRate: number;
    };
  };

  @ApiProperty({ description: 'Revenue per waitlist user' })
  conversionValue: number;
}

// Trend Analysis DTOs

export class TrendDataPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: Date;

  @ApiProperty({ description: 'Users joined on this date' })
  joined: number;

  @ApiProperty({ description: 'Users converted on this date' })
  converted: number;

  @ApiProperty({ description: 'Conversion rate for this date' })
  conversionRate: number;

  @ApiProperty({ description: 'Waitlist size on this date' })
  waitlistSize: number;

  @ApiProperty({ description: 'Average wait time on this date' })
  averageWaitTime: number;
}

export class TrendAnalysisDto {
  @ApiProperty({ description: 'Time series data points', type: [TrendDataPointDto] })
  dataPoints: TrendDataPointDto[];

  @ApiProperty({ description: 'Trend direction', enum: ['increasing', 'decreasing', 'stable'] })
  trend: 'increasing' | 'decreasing' | 'stable';

  @ApiProperty({ description: 'Growth rate percentage' })
  growthRate: number;

  @ApiProperty({ description: 'Seasonal patterns identified' })
  seasonalPatterns: Array<{
    pattern: string;
    description: string;
    impact: number;
  }>;
}

// Queue Performance DTOs

export class QueuePerformanceDto {
  @ApiProperty({ description: 'Current queue metrics' })
  currentMetrics: {
    totalActive: number;
    averageWaitTime: number;
    conversionRate: number;
    positionMovement: number;
    estimatedProcessingTime: number;
  };

  @ApiProperty({ description: 'Processing efficiency metrics' })
  efficiency: {
    ticketsReleasedPerHour: number;
    averageResponseTime: number;
    offerAcceptanceRate: number;
    timeToConversion: number;
  };

  @ApiProperty({ description: 'Queue health indicators' })
  healthIndicators: {
    queueStagnation: boolean;
    highDropoffRate: boolean;
    slowProcessing: boolean;
    lowEngagement: boolean;
  };
}

// Comparative Analysis DTOs

export class ComparativeAnalysisDto {
  @ApiProperty({ description: 'Comparison with previous period' })
  periodComparison: {
    metric: string;
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  @ApiProperty({ description: 'Benchmark comparisons' })
  benchmarks: {
    metric: string;
    value: number;
    industryAverage: number;
    performance: 'above' | 'below' | 'at' | 'unknown';
  }[];

  @ApiProperty({ description: 'Event-to-event comparisons' })
  eventComparisons: Array<{
    eventId: string;
    eventName: string;
    metric: string;
    value: number;
    rank: number;
  }>;
}

// Predictive Analytics DTOs

export class PredictiveAnalyticsDto {
  @ApiProperty({ description: 'Demand forecasting' })
  demandForecast: {
    nextWeek: number;
    nextMonth: number;
    peakPeriods: Array<{
      period: string;
      expectedDemand: number;
      confidence: number;
    }>;
  };

  @ApiProperty({ description: 'Conversion predictions' })
  conversionPredictions: {
    expectedConversions: number;
    timeToTarget: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };

  @ApiProperty({ description: 'Revenue projections' })
  revenueProjections: {
    expectedRevenue: number;
    revenueRange: {
      conservative: number;
      optimistic: number;
    };
    factors: string[];
  };
}

// Segmentation Analysis DTOs

export class SegmentationAnalysisDto {
  @ApiProperty({ description: 'User segments with performance metrics' })
  segments: Array<{
    segmentId: string;
    name: string;
    description: string;
    size: number;
    conversionRate: number;
    averageWaitTime: number;
    revenueContribution: number;
    characteristics: string[];
  }>;

  @ApiProperty({ description: 'Segment performance comparison' })
  segmentComparison: {
    topPerforming: string[];
    underPerforming: string[];
    opportunities: string[];
  };

  @ApiProperty({ description: 'Targeting recommendations' })
  targetingRecommendations: Array<{
    segment: string;
    strategy: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Real-time Dashboard DTOs

export class RealTimeDashboardDto {
  @ApiProperty({ description: 'Live queue status' })
  liveStatus: {
    activeUsers: number;
    recentJoins: number;
    recentConversions: number;
    currentProcessingRate: number;
    lastUpdated: Date;
  };

  @ApiProperty({ description: 'Recent activity feed' })
  activityFeed: Array<{
    timestamp: Date;
    type: 'join' | 'convert' | 'leave' | 'upgrade' | 'offer';
    description: string;
    userId?: string;
    eventId?: string;
  }>;

  @ApiProperty({ description: 'Alert notifications' })
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

// Report Generation DTOs

export class AnalyticsReportDto {
  @ApiProperty({ description: 'Report metadata' })
  metadata: {
    reportId: string;
    generatedAt: Date;
    period: {
      start: Date;
      end: Date;
    };
    eventId?: string;
    reportType: string;
  };

  @ApiProperty({ description: 'Executive summary' })
  summary: {
    totalWaitlisted: number;
    conversionRate: number;
    revenueGenerated: number;
    averageWaitTime: number;
    keyInsights: string[];
  };

  @ApiProperty({ description: 'Detailed recommendations' })
  recommendations: Array<{
    category: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;

  @ApiProperty({ description: 'Key performance metrics' })
  keyMetrics: {
    [metric: string]: {
      value: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
      benchmark?: number;
    };
  };

  @ApiProperty({ description: 'Action items' })
  actionItems: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    assignee?: string;
    dueDate?: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}

// Query DTOs for Analytics Endpoints

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Time period for analytics', enum: AnalyticsPeriod })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({ description: 'Start date for custom range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  detailed?: boolean;

  @ApiPropertyOptional({ description: 'Specific metrics to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional({ description: 'Segment by priority levels', isArray: true, enum: WaitlistPriority })
  @IsOptional()
  @IsArray()
  @IsEnum(WaitlistPriority, { each: true })
  segmentByPriority?: WaitlistPriority[];

  @ApiPropertyOptional({ description: 'Include predictive analytics' })
  @IsOptional()
  @IsBoolean()
  includePredictions?: boolean;

  @ApiPropertyOptional({ description: 'Compare with previous period' })
  @IsOptional()
  @IsBoolean()
  compareWithPrevious?: boolean;
}

export class DashboardConfigDto {
  @ApiProperty({ description: 'Dashboard layout configuration' })
  layout: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      config: any;
    }>;
  };

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  refreshInterval?: number;

  @ApiPropertyOptional({ description: 'Time zone for date displays' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Default date range' })
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'quarter', 'year', 'custom'])
  defaultDateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

// Export Configuration DTOs

export class ExportConfigDto {
  @ApiProperty({ description: 'Export format', enum: ['pdf', 'excel', 'csv', 'json'] })
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  format: 'pdf' | 'excel' | 'csv' | 'json';

  @ApiPropertyOptional({ description: 'Include charts and visualizations' })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: 'Sections to include in export' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];

  @ApiPropertyOptional({ description: 'Custom branding options' })
  @IsOptional()
  @IsObject()
  branding?: {
    logo?: string;
    colors?: string[];
    companyName?: string;
  };
}

// Comprehensive Analytics Response DTO

export class ComprehensiveAnalyticsDto {
  @ApiProperty({ description: 'Overview metrics', type: WaitlistOverviewDto })
  overview: WaitlistOverviewDto;

  @ApiProperty({ description: 'Trend analysis', type: [TrendDataPointDto] })
  trends: TrendDataPointDto[];

  @ApiProperty({ description: 'Conversion funnel', type: ConversionFunnelDto })
  conversionFunnel: ConversionFunnelDto;

  @ApiProperty({ description: 'Priority breakdown', type: PriorityBreakdownDto })
  priorityBreakdown: PriorityBreakdownDto;

  @ApiProperty({ description: 'Notification metrics', type: NotificationMetricsDto })
  notificationMetrics: NotificationMetricsDto;

  @ApiProperty({ description: 'Demand insights', type: DemandInsightsDto })
  demandInsights: DemandInsightsDto;

  @ApiProperty({ description: 'Revenue impact', type: RevenueImpactDto })
  revenueImpact: RevenueImpactDto;

  @ApiPropertyOptional({ description: 'Queue performance', type: QueuePerformanceDto })
  queuePerformance?: QueuePerformanceDto;

  @ApiPropertyOptional({ description: 'Comparative analysis', type: ComparativeAnalysisDto })
  comparativeAnalysis?: ComparativeAnalysisDto;

  @ApiPropertyOptional({ description: 'Predictive analytics', type: PredictiveAnalyticsDto })
  predictiveAnalytics?: PredictiveAnalyticsDto;

  @ApiPropertyOptional({ description: 'Segmentation analysis', type: SegmentationAnalysisDto })
  segmentationAnalysis?: SegmentationAnalysisDto;
}
