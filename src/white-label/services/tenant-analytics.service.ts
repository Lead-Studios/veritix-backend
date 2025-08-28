import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TenantAnalytics, MetricType } from '../entities/tenant-analytics.entity';

export interface CreateAnalyticsDto {
  metricName: string;
  metricType: MetricType;
  value: number;
  unit?: string;
  date: Date;
  dimensions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AnalyticsQuery {
  metricNames?: string[];
  metricTypes?: MetricType[];
  startDate?: Date;
  endDate?: Date;
  dimensions?: Record<string, any>;
}

@Injectable()
export class TenantAnalyticsService {
  constructor(
    @InjectRepository(TenantAnalytics)
    private analyticsRepository: Repository<TenantAnalytics>,
  ) {}

  async recordMetric(tenantId: string, createDto: CreateAnalyticsDto): Promise<TenantAnalytics> {
    const metric = this.analyticsRepository.create({
      ...createDto,
      tenantId,
    });

    return this.analyticsRepository.save(metric);
  }

  async recordBulkMetrics(tenantId: string, metrics: CreateAnalyticsDto[]): Promise<TenantAnalytics[]> {
    const analyticsEntries = metrics.map(metric => 
      this.analyticsRepository.create({
        ...metric,
        tenantId,
      })
    );

    return this.analyticsRepository.save(analyticsEntries);
  }

  async getMetrics(tenantId: string, query: AnalyticsQuery): Promise<TenantAnalytics[]> {
    const queryBuilder = this.analyticsRepository.createQueryBuilder('analytics')
      .where('analytics.tenantId = :tenantId', { tenantId });

    if (query.metricNames?.length) {
      queryBuilder.andWhere('analytics.metricName IN (:...metricNames)', { 
        metricNames: query.metricNames 
      });
    }

    if (query.metricTypes?.length) {
      queryBuilder.andWhere('analytics.metricType IN (:...metricTypes)', { 
        metricTypes: query.metricTypes 
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    if (query.dimensions) {
      for (const [key, value] of Object.entries(query.dimensions)) {
        queryBuilder.andWhere(`analytics.dimensions->>'${key}' = :${key}`, { [key]: value });
      }
    }

    return queryBuilder
      .orderBy('analytics.date', 'DESC')
      .getMany();
  }

  async getUsageMetrics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const dateFilter = startDate && endDate ? { startDate, endDate } : this.getDefaultDateRange();

    const metrics = await this.getMetrics(tenantId, {
      metricTypes: [MetricType.USAGE],
      ...dateFilter,
    });

    const usageData = {
      users: this.aggregateMetric(metrics, 'active_users'),
      events: this.aggregateMetric(metrics, 'total_events'),
      tickets: this.aggregateMetric(metrics, 'tickets_sold'),
      storage: this.aggregateMetric(metrics, 'storage_used'),
      apiCalls: this.aggregateMetric(metrics, 'api_calls'),
    };

    return {
      period: { start: dateFilter.startDate, end: dateFilter.endDate },
      usage: usageData,
      trends: this.calculateTrends(metrics),
    };
  }

  async getPerformanceMetrics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const dateFilter = startDate && endDate ? { startDate, endDate } : this.getDefaultDateRange();

    const metrics = await this.getMetrics(tenantId, {
      metricTypes: [MetricType.PERFORMANCE],
      ...dateFilter,
    });

    return {
      period: { start: dateFilter.startDate, end: dateFilter.endDate },
      performance: {
        responseTime: this.aggregateMetric(metrics, 'avg_response_time'),
        uptime: this.aggregateMetric(metrics, 'uptime_percentage'),
        errorRate: this.aggregateMetric(metrics, 'error_rate'),
        throughput: this.aggregateMetric(metrics, 'requests_per_second'),
      },
      sla: this.calculateSLACompliance(metrics),
    };
  }

  async getBillingMetrics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const dateFilter = startDate && endDate ? { startDate, endDate } : this.getDefaultDateRange();

    const metrics = await this.getMetrics(tenantId, {
      metricTypes: [MetricType.BILLING],
      ...dateFilter,
    });

    return {
      period: { start: dateFilter.startDate, end: dateFilter.endDate },
      billing: {
        revenue: this.aggregateMetric(metrics, 'revenue'),
        costs: this.aggregateMetric(metrics, 'costs'),
        profit: this.calculateProfit(metrics),
        transactions: this.aggregateMetric(metrics, 'transaction_count'),
      },
      growth: this.calculateGrowthRate(metrics),
    };
  }

  async getFeatureUsageMetrics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const dateFilter = startDate && endDate ? { startDate, endDate } : this.getDefaultDateRange();

    const metrics = await this.getMetrics(tenantId, {
      metricTypes: [MetricType.FEATURE],
      ...dateFilter,
    });

    const featureUsage = {};
    for (const metric of metrics) {
      if (!featureUsage[metric.metricName]) {
        featureUsage[metric.metricName] = {
          totalUsage: 0,
          uniqueUsers: new Set(),
          dailyUsage: {},
        };
      }

      featureUsage[metric.metricName].totalUsage += metric.value;
      
      if (metric.dimensions?.userId) {
        featureUsage[metric.metricName].uniqueUsers.add(metric.dimensions.userId);
      }

      const dateKey = metric.date.toISOString().split('T')[0];
      featureUsage[metric.metricName].dailyUsage[dateKey] = 
        (featureUsage[metric.metricName].dailyUsage[dateKey] || 0) + metric.value;
    }

    // Convert Set to count
    for (const feature of Object.keys(featureUsage)) {
      featureUsage[feature].uniqueUsers = featureUsage[feature].uniqueUsers.size;
    }

    return {
      period: { start: dateFilter.startDate, end: dateFilter.endDate },
      features: featureUsage,
      adoption: this.calculateFeatureAdoption(featureUsage),
    };
  }

  async getDashboardMetrics(tenantId: string): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [usage, performance, billing, features] = await Promise.all([
      this.getUsageMetrics(tenantId, thirtyDaysAgo, now),
      this.getPerformanceMetrics(tenantId, thirtyDaysAgo, now),
      this.getBillingMetrics(tenantId, thirtyDaysAgo, now),
      this.getFeatureUsageMetrics(tenantId, thirtyDaysAgo, now),
    ]);

    return {
      summary: {
        totalUsers: usage.usage.users.current,
        totalEvents: usage.usage.events.current,
        totalRevenue: billing.billing.revenue.total,
        uptime: performance.performance.uptime.average,
      },
      usage,
      performance,
      billing,
      features,
      lastUpdated: now,
    };
  }

  async recordUsageMetric(tenantId: string, metricName: string, value: number, dimensions?: Record<string, any>): Promise<void> {
    await this.recordMetric(tenantId, {
      metricName,
      metricType: MetricType.USAGE,
      value,
      date: new Date(),
      dimensions,
    });
  }

  async recordPerformanceMetric(tenantId: string, metricName: string, value: number, unit?: string): Promise<void> {
    await this.recordMetric(tenantId, {
      metricName,
      metricType: MetricType.PERFORMANCE,
      value,
      unit,
      date: new Date(),
    });
  }

  async recordBillingMetric(tenantId: string, metricName: string, value: number, metadata?: Record<string, any>): Promise<void> {
    await this.recordMetric(tenantId, {
      metricName,
      metricType: MetricType.BILLING,
      value,
      unit: 'USD',
      date: new Date(),
      metadata,
    });
  }

  async recordFeatureUsage(tenantId: string, featureName: string, userId?: string): Promise<void> {
    await this.recordMetric(tenantId, {
      metricName: featureName,
      metricType: MetricType.FEATURE,
      value: 1,
      date: new Date(),
      dimensions: userId ? { userId } : undefined,
    });
  }

  private aggregateMetric(metrics: TenantAnalytics[], metricName: string): any {
    const filtered = metrics.filter(m => m.metricName === metricName);
    
    if (filtered.length === 0) {
      return { current: 0, total: 0, average: 0, min: 0, max: 0 };
    }

    const values = filtered.map(m => m.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const current = values[values.length - 1] || 0;

    return { current, total, average, min, max };
  }

  private calculateTrends(metrics: TenantAnalytics[]): any {
    const trends = {};
    const metricNames = [...new Set(metrics.map(m => m.metricName))];

    for (const metricName of metricNames) {
      const metricData = metrics
        .filter(m => m.metricName === metricName)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (metricData.length >= 2) {
        const first = metricData[0].value;
        const last = metricData[metricData.length - 1].value;
        const change = last - first;
        const percentChange = first !== 0 ? (change / first) * 100 : 0;

        trends[metricName] = {
          change,
          percentChange,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        };
      }
    }

    return trends;
  }

  private calculateSLACompliance(metrics: TenantAnalytics[]): any {
    const uptimeMetrics = metrics.filter(m => m.metricName === 'uptime_percentage');
    
    if (uptimeMetrics.length === 0) {
      return { compliance: 0, target: 99.9, status: 'unknown' };
    }

    const averageUptime = uptimeMetrics.reduce((sum, m) => sum + m.value, 0) / uptimeMetrics.length;
    const target = 99.9; // Default SLA target
    const compliance = (averageUptime / target) * 100;

    return {
      compliance: Math.min(compliance, 100),
      target,
      status: compliance >= 100 ? 'met' : 'breach',
      actualUptime: averageUptime,
    };
  }

  private calculateProfit(metrics: TenantAnalytics[]): any {
    const revenue = this.aggregateMetric(metrics, 'revenue');
    const costs = this.aggregateMetric(metrics, 'costs');

    return {
      total: revenue.total - costs.total,
      margin: revenue.total > 0 ? ((revenue.total - costs.total) / revenue.total) * 100 : 0,
    };
  }

  private calculateGrowthRate(metrics: TenantAnalytics[]): any {
    const revenueMetrics = metrics
      .filter(m => m.metricName === 'revenue')
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (revenueMetrics.length < 2) {
      return { monthlyGrowthRate: 0, trend: 'stable' };
    }

    // Calculate month-over-month growth
    const periods = this.groupByMonth(revenueMetrics);
    const monthlyGrowthRates = [];

    for (let i = 1; i < periods.length; i++) {
      const current = periods[i].total;
      const previous = periods[i - 1].total;
      const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      monthlyGrowthRates.push(growthRate);
    }

    const avgGrowthRate = monthlyGrowthRates.length > 0 
      ? monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length 
      : 0;

    return {
      monthlyGrowthRate: avgGrowthRate,
      trend: avgGrowthRate > 0 ? 'growing' : avgGrowthRate < 0 ? 'declining' : 'stable',
    };
  }

  private calculateFeatureAdoption(featureUsage: any): any {
    const features = Object.keys(featureUsage);
    const totalUsers = Math.max(...features.map(f => featureUsage[f].uniqueUsers));

    const adoption = {};
    for (const feature of features) {
      const users = featureUsage[feature].uniqueUsers;
      adoption[feature] = {
        adoptionRate: totalUsers > 0 ? (users / totalUsers) * 100 : 0,
        users,
        totalUsage: featureUsage[feature].totalUsage,
      };
    }

    return adoption;
  }

  private groupByMonth(metrics: TenantAnalytics[]): any[] {
    const groups = {};

    for (const metric of metrics) {
      const monthKey = `${metric.date.getFullYear()}-${metric.date.getMonth() + 1}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = { total: 0, count: 0 };
      }
      
      groups[monthKey].total += metric.value;
      groups[monthKey].count += 1;
    }

    return Object.values(groups);
  }

  private getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return { startDate, endDate };
  }
}
