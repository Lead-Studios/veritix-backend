import { FunnelStage } from '../entities/funnel-action.entity';

export class FunnelStageStatsDto {
  stage: FunnelStage;
  totalSessions: number;
  totalActions: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeSpent: number;
  totalTimeSpent: number;
  totalRevenue: number;
  trafficSourceBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  utmBreakdown: Record<string, number>;
}

export class FunnelStatsResponseDto {
  eventId: string;
  eventName: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  totalSessions: number;
  totalRevenue: number;
  overallConversionRate: number;
  stages: FunnelStageStatsDto[];
  summary: {
    totalViews: number;
    totalPurchases: number;
    avgSessionDuration: number;
    topTrafficSources: Array<{ source: string; count: number }>;
    topCountries: Array<{ country: string; count: number }>;
  };
} 