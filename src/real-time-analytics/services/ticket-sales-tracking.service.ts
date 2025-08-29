import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketSalesMetrics, SalesChannel, MetricType } from '../entities/ticket-sales-metrics.entity';
import { RevenueProjection } from '../entities/revenue-projection.entity';

export interface SalesProjection {
  projectedFinalSales: number;
  projectedFinalRevenue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number;
  };
  selloutProbability: number;
  projectedSelloutTime: Date | null;
  keyFactors: string[];
}

export interface SalesAlert {
  id: string;
  type: 'velocity_drop' | 'velocity_spike' | 'capacity_warning' | 'revenue_milestone' | 'conversion_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: Date;
  actionRequired: boolean;
  suggestions: string[];
}

@Injectable()
export class TicketSalesTrackingService {
  private readonly logger = new Logger(TicketSalesTrackingService.name);
  private readonly alertThresholds: Record<string, number>;

  constructor(
    @InjectRepository(TicketSalesMetrics)
    private ticketSalesRepository: Repository<TicketSalesMetrics>,
    @InjectRepository(RevenueProjection)
    private revenueProjectionRepository: Repository<RevenueProjection>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.alertThresholds = {
      velocityDropPercentage: this.configService.get<number>('SALES_VELOCITY_DROP_THRESHOLD', 30),
      velocitySpikeMultiplier: this.configService.get<number>('SALES_VELOCITY_SPIKE_THRESHOLD', 3),
      capacityWarningPercentage: this.configService.get<number>('CAPACITY_WARNING_THRESHOLD', 90),
      conversionDropPercentage: this.configService.get<number>('CONVERSION_DROP_THRESHOLD', 25),
      lowVelocityThreshold: this.configService.get<number>('LOW_VELOCITY_THRESHOLD', 5),
    };
  }

  async trackTicketSale(eventId: string, saleData: {
    tierId: string;
    tierName: string;
    quantity: number;
    price: number;
    channel: SalesChannel;
    userId: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    paymentMethod: string;
    promotionalCode?: string;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    timestamp: Date;
  }): Promise<void> {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      let metrics = await this.ticketSalesRepository.findOne({
        where: {
          eventId,
          metricType: MetricType.HOURLY,
          timestamp: currentHour,
        },
      });

      if (!metrics) {
        metrics = this.createNewMetrics(eventId, currentHour);
      }

      this.updateMetricsWithSale(metrics, saleData);
      await this.updateVelocityMetrics(metrics, eventId);
      this.recalculateMetrics(metrics);

      await this.ticketSalesRepository.save(metrics);

      const projection = await this.generateSalesProjection(eventId);
      const alerts = await this.checkForAlerts(eventId, metrics, projection);
      
      this.eventEmitter.emit('ticket.sale.tracked', {
        eventId,
        saleData,
        metrics,
        projection,
        alerts,
      });

      for (const alert of alerts) {
        this.eventEmitter.emit('sales.alert', { eventId, alert });
      }

    } catch (error) {
      this.logger.error(`Failed to track ticket sale for event ${eventId}:`, error);
      throw error;
    }
  }

  async generateSalesProjection(eventId: string): Promise<SalesProjection> {
    try {
      const historicalData = await this.getHistoricalSalesData(eventId);
      
      if (historicalData.length === 0) {
        return this.getDefaultProjection();
      }

      const currentVelocity = this.calculateCurrentVelocity(historicalData);
      const remainingCapacity = await this.getRemainingCapacity(eventId);
      
      const linearProjection = this.calculateLinearProjection(historicalData, currentVelocity);
      const exponentialProjection = this.calculateExponentialProjection(historicalData);
      const seasonalProjection = this.calculateSeasonalProjection(historicalData);
      
      const projectedFinalSales = (
        linearProjection.sales * 0.4 +
        exponentialProjection.sales * 0.3 +
        seasonalProjection.sales * 0.3
      );

      const projectedFinalRevenue = (
        linearProjection.revenue * 0.4 +
        exponentialProjection.revenue * 0.3 +
        seasonalProjection.revenue * 0.3
      );

      const confidenceInterval = this.calculateConfidenceInterval(
        [linearProjection, exponentialProjection, seasonalProjection],
        projectedFinalRevenue
      );

      const selloutAnalysis = this.calculateSelloutAnalysis(
        currentVelocity,
        remainingCapacity,
        historicalData
      );

      const keyFactors = this.identifyKeyFactors(historicalData, currentVelocity);

      return {
        projectedFinalSales,
        projectedFinalRevenue,
        confidenceInterval,
        selloutProbability: selloutAnalysis.probability,
        projectedSelloutTime: selloutAnalysis.time,
        keyFactors,
      };

    } catch (error) {
      this.logger.error(`Failed to generate sales projection for event ${eventId}:`, error);
      return this.getDefaultProjection();
    }
  }

  async getLiveSalesMetrics(eventId: string): Promise<any> {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      const currentMetrics = await this.ticketSalesRepository.findOne({
        where: {
          eventId,
          metricType: MetricType.HOURLY,
          timestamp: currentHour,
        },
      });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dailyMetrics = await this.ticketSalesRepository.find({
        where: {
          eventId,
          metricType: MetricType.HOURLY,
          timestamp: Between(startOfDay, new Date()),
        },
        order: { timestamp: 'ASC' },
      });

      const dailyTotals = this.aggregateDailyTotals(dailyMetrics);
      const projection = await this.generateSalesProjection(eventId);
      const performanceIndicators = this.calculatePerformanceIndicators(
        currentMetrics,
        dailyTotals,
        projection
      );

      return {
        current: currentMetrics || this.getEmptyMetrics(),
        daily: dailyTotals,
        hourlyBreakdown: dailyMetrics,
        projection,
        performanceIndicators,
        lastUpdated: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get live sales metrics for event ${eventId}:`, error);
      throw error;
    }
  }

  private createNewMetrics(eventId: string, timestamp: Date): TicketSalesMetrics {
    return this.ticketSalesRepository.create({
      eventId,
      metricType: MetricType.HOURLY,
      timestamp,
      ticketsSold: 0,
      revenue: 0,
      uniqueVisitors: 0,
      pageViews: 0,
      cartAdditions: 0,
      checkoutInitiations: 0,
      checkoutCompletions: 0,
      refunds: 0,
      refundAmount: 0,
      tierBreakdown: [],
      geographicBreakdown: [],
      deviceBreakdown: [],
      paymentMethodBreakdown: [],
      promotionalCodeUsage: [],
      salesFunnel: {
        visitors: 0,
        eventViews: 0,
        ticketViews: 0,
        cartAdditions: 0,
        checkoutStarts: 0,
        purchases: 0,
        conversionRates: {
          visitorToView: 0,
          viewToCart: 0,
          cartToCheckout: 0,
          checkoutToPurchase: 0,
          overallConversion: 0,
        },
      },
      velocityMetrics: {
        salesPerHour: 0,
        revenuePerHour: 0,
        peakSalesHour: '',
        slowestSalesHour: '',
        averageTimeBetweenSales: 0,
        salesAcceleration: 0,
      },
      customerBehavior: {
        averageTimeOnSite: 0,
        averageTicketsPerPurchase: 0,
        repeatPurchaseRate: 0,
        abandonmentRate: 0,
        averageDecisionTime: 0,
        mobileVsDesktopPreference: {
          mobile: 0,
          desktop: 0,
          tablet: 0,
        },
      },
      marketingAttribution: [],
      conversionRate: 0,
      averageOrderValue: 0,
      refundRate: 0,
      totalCapacity: 0,
      remainingCapacity: 0,
    });
  }

  private updateMetricsWithSale(metrics: TicketSalesMetrics, saleData: any): void {
    metrics.ticketsSold += saleData.quantity;
    metrics.revenue += saleData.price * saleData.quantity;
    metrics.checkoutCompletions += 1;
    metrics.salesFunnel.purchases += saleData.quantity;

    this.updateTierBreakdown(metrics, saleData);
    
    if (saleData.geolocation) {
      this.updateGeographicBreakdown(metrics, saleData);
    }
    
    this.updateDeviceBreakdown(metrics, saleData);
    this.updatePaymentMethodBreakdown(metrics, saleData);
    
    if (saleData.promotionalCode) {
      this.updatePromotionalCodeUsage(metrics, saleData);
    }
    
    this.updateCustomerBehavior(metrics, saleData);
  }

  private updateTierBreakdown(metrics: TicketSalesMetrics, saleData: any): void {
    let tierData = metrics.tierBreakdown.find(t => t.tierId === saleData.tierId);
    
    if (!tierData) {
      tierData = {
        tierId: saleData.tierId,
        tierName: saleData.tierName,
        price: saleData.price,
        sold: 0,
        revenue: 0,
        remaining: 0,
        capacity: 0,
      };
      metrics.tierBreakdown.push(tierData);
    }

    tierData.sold += saleData.quantity;
    tierData.revenue += saleData.price * saleData.quantity;
    tierData.remaining = Math.max(0, tierData.remaining - saleData.quantity);
  }

  private updateGeographicBreakdown(metrics: TicketSalesMetrics, saleData: any): void {
    const { country, region, city } = saleData.geolocation;
    
    let geoData = metrics.geographicBreakdown.find(
      g => g.country === country && g.region === region && g.city === city
    );

    if (!geoData) {
      geoData = {
        country,
        region,
        city,
        sold: 0,
        revenue: 0,
        percentage: 0,
      };
      metrics.geographicBreakdown.push(geoData);
    }

    geoData.sold += saleData.quantity;
    geoData.revenue += saleData.price * saleData.quantity;
  }

  private updateDeviceBreakdown(metrics: TicketSalesMetrics, saleData: any): void {
    let deviceData = metrics.deviceBreakdown.find(d => d.device === saleData.deviceType);

    if (!deviceData) {
      deviceData = {
        device: saleData.deviceType,
        sold: 0,
        revenue: 0,
        conversionRate: 0,
      };
      metrics.deviceBreakdown.push(deviceData);
    }

    deviceData.sold += saleData.quantity;
    deviceData.revenue += saleData.price * saleData.quantity;
  }

  private updatePaymentMethodBreakdown(metrics: TicketSalesMetrics, saleData: any): void {
    let paymentData = metrics.paymentMethodBreakdown.find(p => p.method === saleData.paymentMethod);

    if (!paymentData) {
      paymentData = {
        method: saleData.paymentMethod,
        sold: 0,
        revenue: 0,
        averageProcessingTime: 0,
        failureRate: 0,
      };
      metrics.paymentMethodBreakdown.push(paymentData);
    }

    paymentData.sold += saleData.quantity;
    paymentData.revenue += saleData.price * saleData.quantity;
  }

  private updatePromotionalCodeUsage(metrics: TicketSalesMetrics, saleData: any): void {
    let promoData = metrics.promotionalCodeUsage.find(p => p.code === saleData.promotionalCode);

    if (!promoData) {
      promoData = {
        code: saleData.promotionalCode,
        used: 0,
        discount: 0,
        revenue: 0,
      };
      metrics.promotionalCodeUsage.push(promoData);
    }

    promoData.used += saleData.quantity;
    promoData.revenue += saleData.price * saleData.quantity;
  }

  private updateCustomerBehavior(metrics: TicketSalesMetrics, saleData: any): void {
    const devicePref = metrics.customerBehavior.mobileVsDesktopPreference;
    devicePref[saleData.deviceType] = (devicePref[saleData.deviceType] || 0) + saleData.quantity;

    const totalPurchases = metrics.checkoutCompletions;
    if (totalPurchases > 0) {
      metrics.customerBehavior.averageTicketsPerPurchase = metrics.ticketsSold / totalPurchases;
    }
  }

  private async updateVelocityMetrics(metrics: TicketSalesMetrics, eventId: string): Promise<void> {
    const previousHour = new Date(metrics.timestamp);
    previousHour.setHours(previousHour.getHours() - 1);

    const previousMetrics = await this.ticketSalesRepository.findOne({
      where: {
        eventId,
        metricType: MetricType.HOURLY,
        timestamp: previousHour,
      },
    });

    metrics.velocityMetrics.salesPerHour = metrics.ticketsSold;
    metrics.velocityMetrics.revenuePerHour = metrics.revenue;

    if (previousMetrics) {
      const salesChange = metrics.ticketsSold - previousMetrics.ticketsSold;
      const previousVelocity = previousMetrics.velocityMetrics.salesPerHour;
      
      metrics.velocityMetrics.salesAcceleration = previousVelocity > 0 
        ? (salesChange / previousVelocity) * 100 
        : 0;
    }

    if (metrics.ticketsSold > 1) {
      metrics.velocityMetrics.averageTimeBetweenSales = 60 / metrics.ticketsSold;
    }
  }

  private recalculateMetrics(metrics: TicketSalesMetrics): void {
    const totalSold = metrics.ticketsSold;
    metrics.geographicBreakdown.forEach(geo => {
      geo.percentage = totalSold > 0 ? (geo.sold / totalSold) * 100 : 0;
    });

    if (metrics.uniqueVisitors > 0) {
      metrics.conversionRate = (metrics.ticketsSold / metrics.uniqueVisitors) * 100;
    }

    if (metrics.checkoutCompletions > 0) {
      metrics.averageOrderValue = metrics.revenue / metrics.checkoutCompletions;
    }

    if (metrics.ticketsSold > 0) {
      metrics.refundRate = (metrics.refunds / metrics.ticketsSold) * 100;
    }

    const funnel = metrics.salesFunnel;
    if (funnel.visitors > 0) {
      funnel.conversionRates.visitorToView = (funnel.eventViews / funnel.visitors) * 100;
      funnel.conversionRates.overallConversion = (funnel.purchases / funnel.visitors) * 100;
    }
    if (funnel.eventViews > 0) {
      funnel.conversionRates.viewToCart = (funnel.cartAdditions / funnel.eventViews) * 100;
    }
    if (funnel.cartAdditions > 0) {
      funnel.conversionRates.cartToCheckout = (funnel.checkoutStarts / funnel.cartAdditions) * 100;
    }
    if (funnel.checkoutStarts > 0) {
      funnel.conversionRates.checkoutToPurchase = (funnel.purchases / funnel.checkoutStarts) * 100;
    }
  }

  private async getHistoricalSalesData(eventId: string): Promise<TicketSalesMetrics[]> {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    return await this.ticketSalesRepository.find({
      where: {
        eventId,
        metricType: MetricType.HOURLY,
        timestamp: Between(last24Hours, new Date()),
      },
      order: { timestamp: 'ASC' },
    });
  }

  private calculateCurrentVelocity(historicalData: TicketSalesMetrics[]): number {
    if (historicalData.length === 0) return 0;

    const recent = historicalData.slice(-3);
    return recent.reduce((sum, data) => sum + data.velocityMetrics.salesPerHour, 0) / recent.length;
  }

  private async getRemainingCapacity(eventId: string): Promise<number> {
    return 1000; // Placeholder
  }

  private calculateLinearProjection(historicalData: TicketSalesMetrics[], currentVelocity: number) {
    const totalSales = historicalData.reduce((sum, data) => sum + data.ticketsSold, 0);
    const totalRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);
    
    const hoursRemaining = 24;
    const projectedAdditionalSales = currentVelocity * hoursRemaining;
    const avgPrice = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      sales: totalSales + projectedAdditionalSales,
      revenue: totalRevenue + (projectedAdditionalSales * avgPrice),
    };
  }

  private calculateExponentialProjection(historicalData: TicketSalesMetrics[]) {
    if (historicalData.length < 2) {
      return { sales: 0, revenue: 0 };
    }

    const recent = historicalData.slice(-2);
    const growthRate = recent[1].ticketsSold > 0 
      ? recent[1].ticketsSold / Math.max(recent[0].ticketsSold, 1) 
      : 1;

    const currentSales = historicalData.reduce((sum, data) => sum + data.ticketsSold, 0);
    const currentRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);

    return {
      sales: currentSales * Math.pow(growthRate, 24),
      revenue: currentRevenue * Math.pow(growthRate, 24),
    };
  }

  private calculateSeasonalProjection(historicalData: TicketSalesMetrics[]) {
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    historicalData.forEach(data => {
      const hour = data.timestamp.getHours();
      hourlyAverages[hour] += data.velocityMetrics.salesPerHour;
      hourlyCounts[hour]++;
    });

    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }

    const projectedSales = hourlyAverages.reduce((sum, avg) => sum + avg, 0);
    const avgPrice = this.calculateAveragePrice(historicalData);

    return {
      sales: projectedSales,
      revenue: projectedSales * avgPrice,
    };
  }

  private calculateAveragePrice(historicalData: TicketSalesMetrics[]): number {
    const totalSales = historicalData.reduce((sum, data) => sum + data.ticketsSold, 0);
    const totalRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);
    
    return totalSales > 0 ? totalRevenue / totalSales : 0;
  }

  private calculateConfidenceInterval(projections: any[], finalProjection: number) {
    const values = projections.map(p => p.revenue);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const margin = 1.96 * stdDev;

    return {
      lower: Math.max(0, finalProjection - margin),
      upper: finalProjection + margin,
      confidence: 0.95,
    };
  }

  private calculateSelloutAnalysis(currentVelocity: number, remainingCapacity: number, historicalData: TicketSalesMetrics[]) {
    if (currentVelocity <= 0 || remainingCapacity <= 0) {
      return { probability: 0, time: null };
    }

    const hoursToSellout = remainingCapacity / currentVelocity;
    const selloutTime = new Date();
    selloutTime.setHours(selloutTime.getHours() + hoursToSellout);

    const velocityVariance = this.calculateVelocityVariance(historicalData);
    const probability = Math.max(0, Math.min(1, 1 - (velocityVariance / currentVelocity)));

    return {
      probability: probability * 100,
      time: selloutTime,
    };
  }

  private calculateVelocityVariance(historicalData: TicketSalesMetrics[]): number {
    if (historicalData.length < 2) return 0;

    const velocities = historicalData.map(data => data.velocityMetrics.salesPerHour);
    const mean = velocities.reduce((sum, vel) => sum + vel, 0) / velocities.length;
    const variance = velocities.reduce((sum, vel) => sum + Math.pow(vel - mean, 2), 0) / velocities.length;

    return Math.sqrt(variance);
  }

  private identifyKeyFactors(historicalData: TicketSalesMetrics[], currentVelocity: number): string[] {
    const factors: string[] = [];

    if (currentVelocity > this.alertThresholds.lowVelocityThreshold * 2) {
      factors.push('High sales velocity');
    } else if (currentVelocity < this.alertThresholds.lowVelocityThreshold) {
      factors.push('Low sales velocity');
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 18 && currentHour <= 22) {
      factors.push('Peak evening hours');
    } else if (currentHour >= 2 && currentHour <= 6) {
      factors.push('Off-peak early morning');
    }

    if (historicalData.length >= 2) {
      const recent = historicalData.slice(-2);
      const growth = recent[1].ticketsSold / Math.max(recent[0].ticketsSold, 1);
      
      if (growth > 1.5) {
        factors.push('Accelerating sales growth');
      } else if (growth < 0.7) {
        factors.push('Declining sales trend');
      }
    }

    return factors;
  }

  private async checkForAlerts(eventId: string, metrics: TicketSalesMetrics, projection: SalesProjection): Promise<SalesAlert[]> {
    const alerts: SalesAlert[] = [];

    if (metrics.velocityMetrics.salesAcceleration < -this.alertThresholds.velocityDropPercentage) {
      alerts.push({
        id: `velocity_drop_${Date.now()}`,
        type: 'velocity_drop',
        severity: 'high',
        message: `Sales velocity dropped by ${Math.abs(metrics.velocityMetrics.salesAcceleration).toFixed(1)}%`,
        data: { acceleration: metrics.velocityMetrics.salesAcceleration },
        timestamp: new Date(),
        actionRequired: true,
        suggestions: ['Review marketing campaigns', 'Check for technical issues', 'Consider promotional pricing'],
      });
    }

    if (metrics.capacityUtilization > this.alertThresholds.capacityWarningPercentage) {
      alerts.push({
        id: `capacity_warning_${Date.now()}`,
        type: 'capacity_warning',
        severity: 'critical',
        message: `Event is ${metrics.capacityUtilization.toFixed(1)}% sold out`,
        data: { utilization: metrics.capacityUtilization },
        timestamp: new Date(),
        actionRequired: true,
        suggestions: ['Consider adding more capacity', 'Implement waitlist', 'Adjust pricing strategy'],
      });
    }

    return alerts;
  }

  private aggregateDailyTotals(hourlyMetrics: TicketSalesMetrics[]) {
    return hourlyMetrics.reduce((totals, metrics) => ({
      ticketsSold: totals.ticketsSold + metrics.ticketsSold,
      revenue: totals.revenue + metrics.revenue,
      uniqueVisitors: totals.uniqueVisitors + metrics.uniqueVisitors,
      conversionRate: 0,
      refunds: totals.refunds + metrics.refunds,
    }), {
      ticketsSold: 0,
      revenue: 0,
      uniqueVisitors: 0,
      conversionRate: 0,
      refunds: 0,
    });
  }

  private calculatePerformanceIndicators(currentMetrics: TicketSalesMetrics | null, dailyTotals: any, projection: SalesProjection) {
    return {
      salesVelocity: currentMetrics?.velocityMetrics.salesPerHour || 0,
      conversionRate: currentMetrics?.conversionRate || 0,
      projectionAccuracy: projection.confidenceInterval.confidence * 100,
      selloutRisk: projection.selloutProbability,
    };
  }

  private getDefaultProjection(): SalesProjection {
    return {
      projectedFinalSales: 0,
      projectedFinalRevenue: 0,
      confidenceInterval: { lower: 0, upper: 0, confidence: 0 },
      selloutProbability: 0,
      projectedSelloutTime: null,
      keyFactors: [],
    };
  }

  private getEmptyMetrics() {
    return {
      ticketsSold: 0,
      revenue: 0,
      conversionRate: 0,
      velocityMetrics: { salesPerHour: 0, revenuePerHour: 0 },
    };
  }
}
