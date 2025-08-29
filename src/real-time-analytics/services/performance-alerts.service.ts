import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventAnalytics } from '../entities/event-analytics.entity';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface PerformanceAlert {
  id: string;
  eventId: string;
  organizerId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  recommendations: string[];
  actionItems: ActionItem[];
  triggeredAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'pricing' | 'marketing' | 'operations' | 'customer_service';
  estimatedImpact: string;
  timeToImplement: string;
  completed: boolean;
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity';
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionRequired: boolean;
  estimatedROI?: number;
  implementationCost?: number;
}

@Injectable()
export class PerformanceAlertsService {
  private readonly logger = new Logger(PerformanceAlertsService.name);
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();

  constructor(
    @InjectRepository(EventAnalytics)
    private eventAnalyticsRepository: Repository<EventAnalytics>,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultAlertRules();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPerformanceAlerts() {
    try {
      this.logger.log('Checking performance alerts for all active events');
      
      const activeEvents = await this.getActiveEvents();
      
      for (const event of activeEvents) {
        await this.evaluateEventAlerts(event);
      }
      
    } catch (error) {
      this.logger.error(`Error checking performance alerts: ${error.message}`);
    }
  }

  async evaluateEventAlerts(eventAnalytics: EventAnalytics) {
    const eventId = eventAnalytics.eventId;
    const organizerId = eventAnalytics.organizerId;

    for (const rule of this.alertRules.filter(r => r.enabled)) {
      if (this.isInCooldown(rule)) continue;

      const currentValue = this.extractMetricValue(eventAnalytics, rule.metric);
      const shouldTrigger = this.evaluateCondition(currentValue, rule);

      if (shouldTrigger) {
        await this.triggerAlert(eventId, organizerId, rule, currentValue, eventAnalytics);
      }
    }

    // Generate recommendations
    const recommendations = await this.generateRecommendations(eventAnalytics);
    if (recommendations.length > 0) {
      this.eventEmitter.emit('analytics.recommendations.generated', {
        eventId,
        organizerId,
        recommendations,
        timestamp: new Date(),
      });
    }
  }

  private async triggerAlert(
    eventId: string,
    organizerId: string,
    rule: AlertRule,
    currentValue: number,
    eventAnalytics: EventAnalytics,
  ) {
    const alertId = `${eventId}_${rule.id}_${Date.now()}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      eventId,
      organizerId,
      alertType: rule.name,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, currentValue),
      message: this.generateAlertMessage(rule, currentValue, eventAnalytics),
      currentValue,
      threshold: rule.threshold,
      recommendations: this.generateAlertRecommendations(rule, currentValue, eventAnalytics),
      actionItems: this.generateActionItems(rule, currentValue, eventAnalytics),
      triggeredAt: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    // Update event analytics with alert
    await this.updateEventAnalyticsWithAlert(eventId, alert);

    // Emit alert event
    this.eventEmitter.emit('analytics.alert.triggered', {
      alert,
      eventAnalytics,
      timestamp: new Date(),
    });

    this.logger.warn(`Alert triggered: ${alert.title} for event ${eventId}`);
  }

  private async generateRecommendations(eventAnalytics: EventAnalytics): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const metrics = this.extractAllMetrics(eventAnalytics);

    // Sales velocity recommendations
    if (metrics.salesVelocity < 50) {
      recommendations.push({
        id: `rec_${Date.now()}_sales_velocity`,
        type: 'optimization',
        category: 'marketing',
        title: 'Boost Sales Velocity',
        description: 'Sales velocity is below optimal levels. Consider increasing marketing efforts or implementing promotional campaigns.',
        impact: 'high',
        confidence: 0.85,
        actionRequired: true,
        estimatedROI: 2.5,
        implementationCost: 5000,
      });
    }

    // Pricing optimization
    if (metrics.conversionRate < 0.08) {
      recommendations.push({
        id: `rec_${Date.now()}_pricing`,
        type: 'optimization',
        category: 'pricing',
        title: 'Optimize Ticket Pricing',
        description: 'Low conversion rate suggests pricing may be too high. Consider A/B testing different price points.',
        impact: 'medium',
        confidence: 0.75,
        actionRequired: true,
        estimatedROI: 1.8,
        implementationCost: 2000,
      });
    }

    // Capacity utilization
    if (metrics.capacityUtilization > 0.9) {
      recommendations.push({
        id: `rec_${Date.now()}_capacity`,
        type: 'opportunity',
        category: 'operations',
        title: 'High Demand Opportunity',
        description: 'Event is nearly sold out. Consider adding additional sessions or increasing venue capacity.',
        impact: 'high',
        confidence: 0.95,
        actionRequired: false,
        estimatedROI: 3.2,
        implementationCost: 15000,
      });
    }

    // Social media sentiment
    if (metrics.sentimentScore < 0.6) {
      recommendations.push({
        id: `rec_${Date.now()}_sentiment`,
        type: 'warning',
        category: 'marketing',
        title: 'Address Social Media Sentiment',
        description: 'Social media sentiment is declining. Immediate attention needed for reputation management.',
        impact: 'high',
        confidence: 0.90,
        actionRequired: true,
      });
    }

    // Revenue projection vs actual
    if (metrics.revenueGap > 0.2) {
      recommendations.push({
        id: `rec_${Date.now()}_revenue`,
        type: 'warning',
        category: 'sales',
        title: 'Revenue Target at Risk',
        description: 'Current revenue trajectory is significantly below projections. Immediate action required.',
        impact: 'critical',
        confidence: 0.88,
        actionRequired: true,
      });
    }

    return recommendations;
  }

  private initializeDefaultAlertRules() {
    this.alertRules = [
      {
        id: 'sales_velocity_drop',
        name: 'Sales Velocity Drop',
        metric: 'salesVelocity',
        condition: 'less_than',
        threshold: 30,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60,
      },
      {
        id: 'low_conversion_rate',
        name: 'Low Conversion Rate',
        metric: 'conversionRate',
        condition: 'less_than',
        threshold: 0.05,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 120,
      },
      {
        id: 'capacity_warning',
        name: 'Capacity Warning',
        metric: 'capacityUtilization',
        condition: 'greater_than',
        threshold: 0.95,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 30,
      },
      {
        id: 'sentiment_decline',
        name: 'Sentiment Decline',
        metric: 'sentimentScore',
        condition: 'less_than',
        threshold: 0.5,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 90,
      },
      {
        id: 'revenue_shortfall',
        name: 'Revenue Shortfall',
        metric: 'revenueGap',
        condition: 'greater_than',
        threshold: 0.25,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 180,
      },
      {
        id: 'refund_spike',
        name: 'Refund Spike',
        metric: 'refundRate',
        condition: 'greater_than',
        threshold: 0.1,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60,
      },
    ];
  }

  private async getActiveEvents(): Promise<EventAnalytics[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return await this.eventAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.eventDate BETWEEN :startDate AND :endDate', {
        startDate: thirtyDaysAgo,
        endDate: thirtyDaysFromNow,
      })
      .getMany();
  }

  private extractMetricValue(eventAnalytics: EventAnalytics, metric: string): number {
    const metrics = this.extractAllMetrics(eventAnalytics);
    return metrics[metric] || 0;
  }

  private extractAllMetrics(eventAnalytics: EventAnalytics) {
    const ticketMetrics = eventAnalytics.ticketSalesMetrics || {};
    const socialMetrics = eventAnalytics.socialMediaMetrics || {};
    const revenueProjection = eventAnalytics.revenueProjections || {};

    return {
      salesVelocity: ticketMetrics.salesVelocity || 0,
      conversionRate: ticketMetrics.conversionRate || 0,
      capacityUtilization: ticketMetrics.capacityUtilization || 0,
      sentimentScore: socialMetrics.overallSentiment || 0.5,
      revenueGap: this.calculateRevenueGap(ticketMetrics, revenueProjection),
      refundRate: this.calculateRefundRate(ticketMetrics),
      averageTicketPrice: ticketMetrics.averageTicketPrice || 0,
      totalRevenue: ticketMetrics.totalRevenue || 0,
      ticketsSold: ticketMetrics.totalTicketsSold || 0,
    };
  }

  private calculateRevenueGap(ticketMetrics: any, revenueProjection: any): number {
    const actualRevenue = ticketMetrics.totalRevenue || 0;
    const projectedRevenue = revenueProjection.projectedRevenue || actualRevenue;
    
    if (projectedRevenue === 0) return 0;
    return Math.abs(actualRevenue - projectedRevenue) / projectedRevenue;
  }

  private calculateRefundRate(ticketMetrics: any): number {
    const totalSales = ticketMetrics.totalTicketsSold || 0;
    const refunds = ticketMetrics.refunds || 0;
    
    if (totalSales === 0) return 0;
    return refunds / totalSales;
  }

  private evaluateCondition(currentValue: number, rule: AlertRule): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return currentValue > rule.threshold;
      case 'less_than':
        return currentValue < rule.threshold;
      case 'equals':
        return Math.abs(currentValue - rule.threshold) < 0.01;
      case 'percentage_change':
        // This would require historical comparison
        return false;
      default:
        return false;
    }
  }

  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
    
    return timeSinceLastTrigger < cooldownMs;
  }

  private generateAlertTitle(rule: AlertRule, currentValue: number): string {
    const titles = {
      'Sales Velocity Drop': `Sales velocity dropped to ${currentValue.toFixed(1)} tickets/hour`,
      'Low Conversion Rate': `Conversion rate at ${(currentValue * 100).toFixed(1)}%`,
      'Capacity Warning': `Event ${(currentValue * 100).toFixed(1)}% sold out`,
      'Sentiment Decline': `Social sentiment dropped to ${(currentValue * 100).toFixed(1)}%`,
      'Revenue Shortfall': `Revenue ${(currentValue * 100).toFixed(1)}% below projection`,
      'Refund Spike': `Refund rate increased to ${(currentValue * 100).toFixed(1)}%`,
    };
    
    return titles[rule.name] || `${rule.name}: ${currentValue}`;
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number, eventAnalytics: EventAnalytics): string {
    const eventName = eventAnalytics.eventName || 'Event';
    const messages = {
      'Sales Velocity Drop': `${eventName} sales velocity has dropped significantly. Current rate: ${currentValue.toFixed(1)} tickets/hour (threshold: ${rule.threshold}). This may indicate marketing issues or market saturation.`,
      'Low Conversion Rate': `${eventName} has a low conversion rate of ${(currentValue * 100).toFixed(1)}%. This suggests pricing or value proposition issues that need immediate attention.`,
      'Capacity Warning': `${eventName} is ${(currentValue * 100).toFixed(1)}% sold out. Consider preparing for waitlist management or additional capacity.`,
      'Sentiment Decline': `Social media sentiment for ${eventName} has declined to ${(currentValue * 100).toFixed(1)}%. Monitor social channels and consider reputation management actions.`,
      'Revenue Shortfall': `${eventName} revenue is ${(currentValue * 100).toFixed(1)}% below projections. Immediate action required to meet targets.`,
      'Refund Spike': `${eventName} refund rate has increased to ${(currentValue * 100).toFixed(1)}%. Investigate potential issues with event details or customer satisfaction.`,
    };
    
    return messages[rule.name] || `${rule.name} triggered for ${eventName}`;
  }

  private generateAlertRecommendations(rule: AlertRule, currentValue: number, eventAnalytics: EventAnalytics): string[] {
    const recommendations = {
      'Sales Velocity Drop': [
        'Increase marketing spend and frequency',
        'Launch targeted social media campaigns',
        'Implement limited-time promotional offers',
        'Review and optimize marketing channels',
      ],
      'Low Conversion Rate': [
        'A/B test different pricing strategies',
        'Improve event description and value proposition',
        'Simplify checkout process',
        'Add customer testimonials and social proof',
      ],
      'Capacity Warning': [
        'Prepare waitlist management system',
        'Consider adding additional event sessions',
        'Implement dynamic pricing for remaining tickets',
        'Communicate scarcity to drive urgency',
      ],
      'Sentiment Decline': [
        'Monitor social media mentions actively',
        'Respond to negative feedback promptly',
        'Launch positive PR campaign',
        'Engage with influencers and brand advocates',
      ],
      'Revenue Shortfall': [
        'Implement aggressive marketing campaigns',
        'Consider promotional pricing or bundles',
        'Reach out to past customers directly',
        'Partner with complementary businesses',
      ],
      'Refund Spike': [
        'Investigate root cause of refunds',
        'Improve event communication and expectations',
        'Enhance customer service response',
        'Consider event modifications if needed',
      ],
    };
    
    return recommendations[rule.name] || ['Review event performance metrics', 'Consider consulting with marketing team'];
  }

  private generateActionItems(rule: AlertRule, currentValue: number, eventAnalytics: EventAnalytics): ActionItem[] {
    const baseActions = {
      'Sales Velocity Drop': [
        {
          id: `action_${Date.now()}_1`,
          title: 'Launch Emergency Marketing Campaign',
          description: 'Deploy additional marketing budget across high-performing channels',
          priority: 'high' as const,
          category: 'marketing' as const,
          estimatedImpact: '15-25% increase in sales velocity',
          timeToImplement: '24-48 hours',
          completed: false,
        },
      ],
      'Low Conversion Rate': [
        {
          id: `action_${Date.now()}_2`,
          title: 'Optimize Pricing Strategy',
          description: 'Test lower price points or introduce early bird discounts',
          priority: 'high' as const,
          category: 'pricing' as const,
          estimatedImpact: '20-30% improvement in conversion',
          timeToImplement: '1-2 days',
          completed: false,
        },
      ],
    };
    
    return baseActions[rule.name] || [];
  }

  private async updateEventAnalyticsWithAlert(eventId: string, alert: PerformanceAlert) {
    const analytics = await this.eventAnalyticsRepository.findOne({
      where: { eventId },
    });
    
    if (analytics) {
      const existingAlerts = analytics.alerts || [];
      existingAlerts.push(alert);
      
      await this.eventAnalyticsRepository.update(
        { eventId },
        {
          alerts: existingAlerts,
          updatedAt: new Date(),
        }
      );
    }
  }

  // Public methods for managing alerts
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.eventEmitter.emit('analytics.alert.acknowledged', {
        alertId,
        userId,
        timestamp: new Date(),
      });
    }
  }

  async resolveAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);
      
      this.eventEmitter.emit('analytics.alert.resolved', {
        alertId,
        userId,
        timestamp: new Date(),
      });
    }
  }

  async getActiveAlertsForEvent(eventId: string): Promise<PerformanceAlert[]> {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.eventId === eventId && !alert.resolvedAt);
  }

  async addCustomAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const ruleId = `custom_${Date.now()}`;
    const newRule: AlertRule = {
      ...rule,
      id: ruleId,
    };
    
    this.alertRules.push(newRule);
    return ruleId;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    }
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
  }
}
