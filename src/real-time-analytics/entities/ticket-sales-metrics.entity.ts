import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SalesChannel {
  WEBSITE = 'website',
  MOBILE_APP = 'mobile_app',
  PARTNER = 'partner',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  AFFILIATE = 'affiliate',
  DIRECT = 'direct',
  RESELLER = 'reseller',
}

export enum MetricType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  REAL_TIME = 'real_time',
}

@Entity('ticket_sales_metrics')
@Index(['eventId', 'metricType', 'timestamp'])
@Index(['timestamp'])
@Index(['salesChannel'])
export class TicketSalesMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({
    type: 'enum',
    enum: MetricType,
    default: MetricType.REAL_TIME,
  })
  @Index()
  metricType: MetricType;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: SalesChannel,
    nullable: true,
  })
  @Index()
  salesChannel: SalesChannel;

  @Column({ type: 'int', default: 0 })
  ticketsSold: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'int', default: 0 })
  uniqueVisitors: number;

  @Column({ type: 'int', default: 0 })
  pageViews: number;

  @Column({ type: 'int', default: 0 })
  cartAdditions: number;

  @Column({ type: 'int', default: 0 })
  checkoutInitiations: number;

  @Column({ type: 'int', default: 0 })
  checkoutCompletions: number;

  @Column({ type: 'int', default: 0 })
  refunds: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ type: 'json' })
  tierBreakdown: Array<{
    tierId: string;
    tierName: string;
    price: number;
    sold: number;
    revenue: number;
    remaining: number;
    capacity: number;
  }>;

  @Column({ type: 'json' })
  geographicBreakdown: Array<{
    country: string;
    region: string;
    city: string;
    sold: number;
    revenue: number;
    percentage: number;
  }>;

  @Column({ type: 'json' })
  deviceBreakdown: Array<{
    device: 'desktop' | 'mobile' | 'tablet';
    sold: number;
    revenue: number;
    conversionRate: number;
  }>;

  @Column({ type: 'json' })
  paymentMethodBreakdown: Array<{
    method: string;
    sold: number;
    revenue: number;
    averageProcessingTime: number;
    failureRate: number;
  }>;

  @Column({ type: 'json' })
  promotionalCodeUsage: Array<{
    code: string;
    used: number;
    discount: number;
    revenue: number;
  }>;

  @Column({ type: 'json' })
  salesFunnel: {
    visitors: number;
    eventViews: number;
    ticketViews: number;
    cartAdditions: number;
    checkoutStarts: number;
    purchases: number;
    conversionRates: {
      visitorToView: number;
      viewToCart: number;
      cartToCheckout: number;
      checkoutToPurchase: number;
      overallConversion: number;
    };
  };

  @Column({ type: 'json' })
  velocityMetrics: {
    salesPerHour: number;
    revenuePerHour: number;
    peakSalesHour: string;
    slowestSalesHour: string;
    averageTimeBetweenSales: number; // in minutes
    salesAcceleration: number; // change in velocity
  };

  @Column({ type: 'json' })
  customerBehavior: {
    averageTimeOnSite: number; // in minutes
    averageTicketsPerPurchase: number;
    repeatPurchaseRate: number;
    abandonmentRate: number;
    averageDecisionTime: number; // time from first visit to purchase
    mobileVsDesktopPreference: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  };

  @Column({ type: 'json' })
  marketingAttribution: Array<{
    source: string;
    medium: string;
    campaign: string;
    sold: number;
    revenue: number;
    cost: number;
    roi: number;
    conversionRate: number;
  }>;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageOrderValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  refundRate: number;

  @Column({ type: 'int', default: 0 })
  totalCapacity: number;

  @Column({ type: 'int', default: 0 })
  remainingCapacity: number;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get capacityUtilization(): number {
    return this.totalCapacity > 0 ? 
      ((this.totalCapacity - this.remainingCapacity) / this.totalCapacity) * 100 : 0;
  }

  get salesEfficiency(): number {
    return this.uniqueVisitors > 0 ? 
      (this.ticketsSold / this.uniqueVisitors) * 100 : 0;
  }

  get revenuePerVisitor(): number {
    return this.uniqueVisitors > 0 ? 
      this.revenue / this.uniqueVisitors : 0;
  }

  get averageTicketPrice(): number {
    return this.ticketsSold > 0 ? 
      this.revenue / this.ticketsSold : 0;
  }

  get funnelDropoffRate(): number {
    const funnel = this.salesFunnel;
    return funnel.visitors > 0 ? 
      ((funnel.visitors - funnel.purchases) / funnel.visitors) * 100 : 0;
  }

  get topPerformingTier(): string {
    if (!this.tierBreakdown.length) return 'none';
    
    return this.tierBreakdown
      .sort((a, b) => b.revenue - a.revenue)[0].tierName;
  }

  get topPerformingRegion(): string {
    if (!this.geographicBreakdown.length) return 'unknown';
    
    const top = this.geographicBreakdown
      .sort((a, b) => b.revenue - a.revenue)[0];
    
    return `${top.city}, ${top.country}`;
  }

  get salesMomentum(): 'accelerating' | 'decelerating' | 'steady' {
    const acceleration = this.velocityMetrics.salesAcceleration;
    
    if (acceleration > 0.1) return 'accelerating';
    if (acceleration < -0.1) return 'decelerating';
    return 'steady';
  }

  get performanceIndicators(): Record<string, 'good' | 'average' | 'poor'> {
    return {
      conversionRate: this.conversionRate > 3 ? 'good' : this.conversionRate > 1 ? 'average' : 'poor',
      salesVelocity: this.velocityMetrics.salesPerHour > 10 ? 'good' : 
                    this.velocityMetrics.salesPerHour > 5 ? 'average' : 'poor',
      capacityUtilization: this.capacityUtilization > 70 ? 'good' : 
                          this.capacityUtilization > 40 ? 'average' : 'poor',
      refundRate: this.refundRate < 2 ? 'good' : this.refundRate < 5 ? 'average' : 'poor',
    };
  }

  get projectedSelloutTime(): Date | null {
    if (this.remainingCapacity <= 0 || this.velocityMetrics.salesPerHour <= 0) {
      return null;
    }
    
    const hoursToSellout = this.remainingCapacity / this.velocityMetrics.salesPerHour;
    const selloutTime = new Date();
    selloutTime.setHours(selloutTime.getHours() + hoursToSellout);
    
    return selloutTime;
  }

  get channelPerformanceRanking(): Array<{ channel: string; score: number }> {
    if (!this.marketingAttribution.length) return [];
    
    return this.marketingAttribution
      .map(attr => ({
        channel: attr.source,
        score: (attr.conversionRate * 0.4) + (attr.roi * 0.6),
      }))
      .sort((a, b) => b.score - a.score);
  }
}
