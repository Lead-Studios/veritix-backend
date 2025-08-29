import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum AnalyticsStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum EventPhase {
  PRE_SALE = 'pre_sale',
  ON_SALE = 'on_sale',
  NEAR_EVENT = 'near_event',
  LIVE = 'live',
  POST_EVENT = 'post_event',
}

@Entity('event_analytics')
@Index(['eventId', 'status'])
@Index(['timestamp'])
@Index(['eventPhase'])
export class EventAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({
    type: 'enum',
    enum: AnalyticsStatus,
    default: AnalyticsStatus.ACTIVE,
  })
  @Index()
  status: AnalyticsStatus;

  @Column({
    type: 'enum',
    enum: EventPhase,
    default: EventPhase.PRE_SALE,
  })
  @Index()
  eventPhase: EventPhase;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'json' })
  ticketSalesMetrics: {
    totalSold: number;
    totalRevenue: number;
    salesVelocity: number; // tickets per hour
    revenueVelocity: number; // revenue per hour
    conversionRate: number;
    averageTicketPrice: number;
    refundRate: number;
    salesByTier: Array<{
      tierId: string;
      tierName: string;
      sold: number;
      revenue: number;
      remaining: number;
    }>;
    salesByChannel: Array<{
      channel: string;
      sold: number;
      revenue: number;
      percentage: number;
    }>;
    hourlyBreakdown: Array<{
      hour: string;
      sold: number;
      revenue: number;
      uniqueVisitors: number;
    }>;
  };

  @Column({ type: 'json' })
  attendeeDemographics: {
    ageGroups: Array<{
      range: string;
      count: number;
      percentage: number;
      revenue: number;
    }>;
    genderDistribution: Array<{
      gender: string;
      count: number;
      percentage: number;
    }>;
    geographicDistribution: Array<{
      country: string;
      region: string;
      city: string;
      count: number;
      percentage: number;
      revenue: number;
    }>;
    purchasePatterns: Array<{
      pattern: string;
      count: number;
      description: string;
    }>;
    deviceTypes: Array<{
      device: string;
      count: number;
      percentage: number;
    }>;
    trafficSources: Array<{
      source: string;
      count: number;
      percentage: number;
      conversionRate: number;
    }>;
  };

  @Column({ type: 'json' })
  socialMediaMetrics: {
    mentions: number;
    reach: number;
    engagement: number;
    sentimentScore: number; // -1 to 1
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    platformBreakdown: Array<{
      platform: string;
      mentions: number;
      reach: number;
      engagement: number;
      sentiment: number;
    }>;
    topHashtags: Array<{
      hashtag: string;
      count: number;
      sentiment: number;
    }>;
    influencerMentions: Array<{
      username: string;
      platform: string;
      followers: number;
      engagement: number;
      sentiment: number;
    }>;
    viralityScore: number;
  };

  @Column({ type: 'json' })
  revenueProjections: {
    currentRevenue: number;
    projectedFinalRevenue: number;
    confidenceInterval: {
      lower: number;
      upper: number;
      confidence: number;
    };
    projectionModel: string;
    lastUpdated: Date;
    projectionAccuracy: number;
    scenarioAnalysis: Array<{
      scenario: string;
      probability: number;
      projectedRevenue: number;
      description: string;
    }>;
    milestones: Array<{
      milestone: string;
      targetRevenue: number;
      projectedDate: Date;
      probability: number;
    }>;
  };

  @Column({ type: 'json' })
  performanceComparison: {
    similarEvents: Array<{
      eventId: string;
      eventName: string;
      similarity: number;
      comparison: {
        ticketSales: number; // percentage difference
        revenue: number;
        socialEngagement: number;
        attendeeGrowth: number;
      };
    }>;
    industryBenchmarks: {
      salesVelocity: {
        percentile: number;
        industryAverage: number;
        topPerformers: number;
      };
      conversionRate: {
        percentile: number;
        industryAverage: number;
        topPerformers: number;
      };
      socialEngagement: {
        percentile: number;
        industryAverage: number;
        topPerformers: number;
      };
    };
    historicalComparison: Array<{
      eventId: string;
      eventName: string;
      date: Date;
      comparison: Record<string, number>;
    }>;
  };

  @Column({ type: 'json' })
  alerts: Array<{
    id: string;
    type: 'warning' | 'critical' | 'info' | 'success';
    category: string;
    message: string;
    severity: number;
    triggered: boolean;
    triggeredAt?: Date;
    acknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    autoResolved: boolean;
    resolvedAt?: Date;
    metadata: Record<string, any>;
  }>;

  @Column({ type: 'json' })
  recommendations: Array<{
    id: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    reasoning: string;
    expectedImpact: string;
    confidence: number;
    actionRequired: boolean;
    estimatedROI?: number;
    implementationCost?: number;
    timeToImplement?: string;
    status: 'pending' | 'implemented' | 'dismissed';
    createdAt: Date;
    updatedAt?: Date;
  }>;

  @Column({ type: 'json' })
  customMetrics: Record<string, {
    value: number;
    unit: string;
    description: string;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
  }>;

  @Column({ type: 'int', default: 0 })
  dataPoints: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get salesGrowthRate(): number {
    if (!this.ticketSalesMetrics.hourlyBreakdown || this.ticketSalesMetrics.hourlyBreakdown.length < 2) {
      return 0;
    }
    
    const recent = this.ticketSalesMetrics.hourlyBreakdown.slice(-2);
    const current = recent[1].sold;
    const previous = recent[0].sold;
    
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  get revenueGrowthRate(): number {
    if (!this.ticketSalesMetrics.hourlyBreakdown || this.ticketSalesMetrics.hourlyBreakdown.length < 2) {
      return 0;
    }
    
    const recent = this.ticketSalesMetrics.hourlyBreakdown.slice(-2);
    const current = recent[1].revenue;
    const previous = recent[0].revenue;
    
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  get overallPerformanceScore(): number {
    let score = 0;
    let factors = 0;

    // Sales performance (30%)
    if (this.performanceComparison.industryBenchmarks.salesVelocity) {
      score += this.performanceComparison.industryBenchmarks.salesVelocity.percentile * 0.3;
      factors += 0.3;
    }

    // Conversion rate (25%)
    if (this.performanceComparison.industryBenchmarks.conversionRate) {
      score += this.performanceComparison.industryBenchmarks.conversionRate.percentile * 0.25;
      factors += 0.25;
    }

    // Social engagement (25%)
    if (this.performanceComparison.industryBenchmarks.socialEngagement) {
      score += this.performanceComparison.industryBenchmarks.socialEngagement.percentile * 0.25;
      factors += 0.25;
    }

    // Sentiment score (20%)
    const normalizedSentiment = (this.socialMediaMetrics.sentimentScore + 1) * 50; // Convert -1,1 to 0,100
    score += normalizedSentiment * 0.2;
    factors += 0.2;

    return factors > 0 ? score / factors : 0;
  }

  get criticalAlertsCount(): number {
    return this.alerts.filter(alert => 
      alert.type === 'critical' && alert.triggered && !alert.acknowledged
    ).length;
  }

  get highPriorityRecommendationsCount(): number {
    return this.recommendations.filter(rec => 
      rec.priority === 'high' || rec.priority === 'critical'
    ).length;
  }

  get projectionAccuracyTrend(): 'improving' | 'declining' | 'stable' {
    // This would typically compare with historical accuracy data
    // For now, return based on confidence interval width
    const interval = this.revenueProjections.confidenceInterval;
    const intervalWidth = (interval.upper - interval.lower) / interval.lower;
    
    if (intervalWidth < 0.1) return 'improving';
    if (intervalWidth > 0.3) return 'declining';
    return 'stable';
  }

  get topPerformingChannel(): string {
    if (!this.ticketSalesMetrics.salesByChannel.length) return 'unknown';
    
    return this.ticketSalesMetrics.salesByChannel
      .sort((a, b) => b.revenue - a.revenue)[0].channel;
  }

  get dominantDemographic(): string {
    if (!this.attendeeDemographics.ageGroups.length) return 'unknown';
    
    const topAge = this.attendeeDemographics.ageGroups
      .sort((a, b) => b.percentage - a.percentage)[0];
    
    const topGeo = this.attendeeDemographics.geographicDistribution
      .sort((a, b) => b.percentage - a.percentage)[0];
    
    return `${topAge.range} from ${topGeo.city}, ${topGeo.country}`;
  }
}
