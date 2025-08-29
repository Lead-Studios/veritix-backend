import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventAnalytics } from '../entities/event-analytics.entity';
import { TicketSalesMetrics } from '../entities/ticket-sales-metrics.entity';
import { DemographicsData } from '../entities/demographics-data.entity';
import { SentimentAnalysis } from '../entities/sentiment-analysis.entity';
import { RevenueProjection } from '../entities/revenue-projection.entity';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'map' | 'timeline';
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  position: { x: number; y: number; width: number; height: number };
  dataSource: string;
  configuration: any;
  refreshInterval: number; // in seconds
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartConfiguration {
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';
  xAxis: string;
  yAxis: string[];
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all';
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface MetricConfiguration {
  metric: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  showTrend: boolean;
  trendPeriod: '1h' | '24h' | '7d';
  threshold?: { warning: number; critical: number };
}

export interface TableConfiguration {
  columns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageSize: number;
  showPagination: boolean;
}

@Injectable()
export class DashboardWidgetsService {
  private readonly logger = new Logger(DashboardWidgetsService.name);

  constructor(
    @InjectRepository(EventAnalytics)
    private eventAnalyticsRepository: Repository<EventAnalytics>,
    @InjectRepository(TicketSalesMetrics)
    private ticketSalesRepository: Repository<TicketSalesMetrics>,
    @InjectRepository(DemographicsData)
    private demographicsRepository: Repository<DemographicsData>,
    @InjectRepository(SentimentAnalysis)
    private sentimentRepository: Repository<SentimentAnalysis>,
    @InjectRepository(RevenueProjection)
    private revenueProjectionRepository: Repository<RevenueProjection>,
  ) {}

  async getWidgetData(widgetId: string, eventId: string, config: any): Promise<any> {
    try {
      switch (config.dataSource) {
        case 'ticket_sales':
          return await this.getTicketSalesData(eventId, config);
        case 'demographics':
          return await this.getDemographicsData(eventId, config);
        case 'sentiment':
          return await this.getSentimentData(eventId, config);
        case 'revenue':
          return await this.getRevenueData(eventId, config);
        case 'comparative':
          return await this.getComparativeData(eventId, config);
        default:
          throw new Error(`Unknown data source: ${config.dataSource}`);
      }
    } catch (error) {
      this.logger.error(`Error getting widget data: ${error.message}`);
      throw error;
    }
  }

  private async getTicketSalesData(eventId: string, config: ChartConfiguration): Promise<any> {
    const timeRange = this.getTimeRangeFilter(config.timeRange);
    
    const salesData = await this.ticketSalesRepository
      .createQueryBuilder('sales')
      .where('sales.eventId = :eventId', { eventId })
      .andWhere('sales.timestamp >= :startDate', { startDate: timeRange.start })
      .orderBy('sales.timestamp', 'ASC')
      .getMany();

    switch (config.chartType) {
      case 'line':
        return this.formatTimeSeriesData(salesData, config);
      case 'bar':
        return this.formatBarChartData(salesData, config);
      case 'pie':
        return this.formatPieChartData(salesData, config);
      default:
        return this.formatTimeSeriesData(salesData, config);
    }
  }

  private async getDemographicsData(eventId: string, config: any): Promise<any> {
    const demographics = await this.demographicsRepository.findOne({
      where: { eventId },
      order: { timestamp: 'DESC' },
    });

    if (!demographics) return { labels: [], datasets: [] };

    switch (config.chartType) {
      case 'pie':
        return this.formatDemographicsPieChart(demographics, config);
      case 'bar':
        return this.formatDemographicsBarChart(demographics, config);
      default:
        return this.formatDemographicsPieChart(demographics, config);
    }
  }

  private async getSentimentData(eventId: string, config: ChartConfiguration): Promise<any> {
    const timeRange = this.getTimeRangeFilter(config.timeRange);
    
    const sentimentData = await this.sentimentRepository
      .createQueryBuilder('sentiment')
      .where('sentiment.eventId = :eventId', { eventId })
      .andWhere('sentiment.timestamp >= :startDate', { startDate: timeRange.start })
      .orderBy('sentiment.timestamp', 'ASC')
      .getMany();

    return this.formatSentimentChart(sentimentData, config);
  }

  private async getRevenueData(eventId: string, config: ChartConfiguration): Promise<any> {
    const projection = await this.revenueProjectionRepository.findOne({
      where: { eventId },
      order: { generatedAt: 'DESC' },
    });

    if (!projection) return { labels: [], datasets: [] };

    return this.formatRevenueChart(projection, config);
  }

  private async getComparativeData(eventId: string, config: any): Promise<any> {
    const analytics = await this.eventAnalyticsRepository.findOne({
      where: { eventId },
    });

    if (!analytics?.comparativeAnalysis) return { labels: [], datasets: [] };

    return this.formatComparativeChart(analytics.comparativeAnalysis, config);
  }

  // Chart formatting methods
  private formatTimeSeriesData(data: any[], config: ChartConfiguration) {
    const labels = data.map(item => this.formatTimestamp(item.timestamp, config.timeRange));
    const datasets = config.yAxis.map((axis, index) => ({
      label: this.formatAxisLabel(axis),
      data: data.map(item => this.extractValue(item, axis)),
      borderColor: config.colors[index] || this.getDefaultColor(index),
      backgroundColor: this.addAlpha(config.colors[index] || this.getDefaultColor(index), 0.1),
      fill: config.chartType === 'area',
    }));

    return { labels, datasets };
  }

  private formatBarChartData(data: any[], config: ChartConfiguration) {
    const aggregatedData = this.aggregateData(data, config);
    const labels = Object.keys(aggregatedData);
    const datasets = [{
      label: this.formatAxisLabel(config.yAxis[0]),
      data: Object.values(aggregatedData),
      backgroundColor: config.colors || this.getDefaultColors(labels.length),
    }];

    return { labels, datasets };
  }

  private formatPieChartData(data: any[], config: ChartConfiguration) {
    const aggregatedData = this.aggregateData(data, config);
    const labels = Object.keys(aggregatedData);
    const values = Object.values(aggregatedData);

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: config.colors || this.getDefaultColors(labels.length),
      }],
    };
  }

  private formatDemographicsPieChart(demographics: DemographicsData, config: any) {
    const field = config.field || 'ageDistribution';
    const distribution = demographics[field] || {};
    
    return {
      labels: Object.keys(distribution),
      datasets: [{
        data: Object.values(distribution),
        backgroundColor: this.getDefaultColors(Object.keys(distribution).length),
      }],
    };
  }

  private formatDemographicsBarChart(demographics: DemographicsData, config: any) {
    const fields = config.fields || ['ageDistribution', 'genderDistribution'];
    const datasets = fields.map((field, index) => {
      const distribution = demographics[field] || {};
      return {
        label: this.formatFieldLabel(field),
        data: Object.values(distribution),
        backgroundColor: this.getDefaultColor(index),
      };
    });

    const labels = Object.keys(demographics[fields[0]] || {});
    return { labels, datasets };
  }

  private formatSentimentChart(data: SentimentAnalysis[], config: ChartConfiguration) {
    const labels = data.map(item => this.formatTimestamp(item.timestamp, config.timeRange));
    const datasets = [{
      label: 'Overall Sentiment',
      data: data.map(item => item.overallSentiment * 100),
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
    }, {
      label: 'Positive %',
      data: data.map(item => item.sentimentBreakdown?.positive || 0),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    }, {
      label: 'Negative %',
      data: data.map(item => item.sentimentBreakdown?.negative || 0),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    }];

    return { labels, datasets };
  }

  private formatRevenueChart(projection: RevenueProjection, config: ChartConfiguration) {
    const scenarios = projection.scenarioAnalysis || [];
    const labels = scenarios.map(s => s.scenario);
    const datasets = [{
      label: 'Projected Revenue',
      data: scenarios.map(s => s.projectedRevenue),
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
    }];

    return { labels, datasets };
  }

  private formatComparativeChart(comparative: any, config: any) {
    const comparisons = comparative.benchmarkComparisons || [];
    const labels = comparisons.map(c => this.formatMetricLabel(c.metric));
    const datasets = [{
      label: 'Current Performance',
      data: comparisons.map(c => c.currentValue),
      backgroundColor: '#3B82F6',
    }, {
      label: 'Benchmark',
      data: comparisons.map(c => c.benchmarkValue),
      backgroundColor: '#6B7280',
    }];

    return { labels, datasets };
  }

  // Widget templates
  async getDefaultWidgets(eventId: string): Promise<DashboardWidget[]> {
    return [
      {
        id: 'sales-overview',
        type: 'chart',
        title: 'Ticket Sales Overview',
        size: 'large',
        position: { x: 0, y: 0, width: 8, height: 4 },
        dataSource: 'ticket_sales',
        configuration: {
          chartType: 'line',
          xAxis: 'timestamp',
          yAxis: ['totalTicketsSold', 'totalRevenue'],
          timeRange: '7d',
          showLegend: true,
          showGrid: true,
        },
        refreshInterval: 300,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'revenue-metrics',
        type: 'metric',
        title: 'Revenue Metrics',
        size: 'medium',
        position: { x: 8, y: 0, width: 4, height: 2 },
        dataSource: 'ticket_sales',
        configuration: {
          metric: 'totalRevenue',
          format: 'currency',
          showTrend: true,
          trendPeriod: '24h',
        },
        refreshInterval: 60,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demographics-pie',
        type: 'chart',
        title: 'Attendee Demographics',
        size: 'medium',
        position: { x: 8, y: 2, width: 4, height: 4 },
        dataSource: 'demographics',
        configuration: {
          chartType: 'pie',
          field: 'ageDistribution',
        },
        refreshInterval: 600,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sentiment-timeline',
        type: 'chart',
        title: 'Social Media Sentiment',
        size: 'large',
        position: { x: 0, y: 4, width: 8, height: 3 },
        dataSource: 'sentiment',
        configuration: {
          chartType: 'area',
          timeRange: '24h',
          showLegend: true,
        },
        refreshInterval: 300,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'performance-gauge',
        type: 'gauge',
        title: 'Overall Performance',
        size: 'small',
        position: { x: 0, y: 7, width: 3, height: 3 },
        dataSource: 'comparative',
        configuration: {
          metric: 'overallPerformanceScore',
          min: 0,
          max: 100,
          thresholds: [30, 70],
        },
        refreshInterval: 300,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  // Helper methods
  private getTimeRangeFilter(timeRange: string) {
    const now = new Date();
    const ranges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      'all': new Date(0),
    };

    return {
      start: ranges[timeRange] || ranges['7d'],
      end: now,
    };
  }

  private formatTimestamp(timestamp: Date, timeRange: string): string {
    const date = new Date(timestamp);
    
    switch (timeRange) {
      case '1h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '24h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '7d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '30d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString('en-US');
    }
  }

  private extractValue(item: any, path: string): number {
    return path.split('.').reduce((obj, key) => obj?.[key], item) || 0;
  }

  private aggregateData(data: any[], config: ChartConfiguration): Record<string, number> {
    const aggregated: Record<string, number[]> = {};
    
    data.forEach(item => {
      const key = this.extractValue(item, config.xAxis);
      const value = this.extractValue(item, config.yAxis[0]);
      
      if (!aggregated[key]) aggregated[key] = [];
      aggregated[key].push(value);
    });

    const result: Record<string, number> = {};
    Object.entries(aggregated).forEach(([key, values]) => {
      switch (config.aggregation) {
        case 'sum':
          result[key] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          result[key] = values.length;
          break;
        case 'min':
          result[key] = Math.min(...values);
          break;
        case 'max':
          result[key] = Math.max(...values);
          break;
        default:
          result[key] = values.reduce((sum, val) => sum + val, 0);
      }
    });

    return result;
  }

  private formatAxisLabel(axis: string): string {
    const labels = {
      totalTicketsSold: 'Tickets Sold',
      totalRevenue: 'Revenue ($)',
      salesVelocity: 'Sales Velocity',
      conversionRate: 'Conversion Rate (%)',
      capacityUtilization: 'Capacity Utilization (%)',
    };
    return labels[axis] || axis;
  }

  private formatFieldLabel(field: string): string {
    const labels = {
      ageDistribution: 'Age Distribution',
      genderDistribution: 'Gender Distribution',
      locationDistribution: 'Location Distribution',
      incomeDistribution: 'Income Distribution',
    };
    return labels[field] || field;
  }

  private formatMetricLabel(metric: string): string {
    const labels = {
      revenuePerAttendee: 'Revenue per Attendee',
      capacityUtilization: 'Capacity Utilization',
      conversionRate: 'Conversion Rate',
      salesVelocity: 'Sales Velocity',
      marketingROI: 'Marketing ROI',
      socialMediaEngagement: 'Social Engagement',
    };
    return labels[metric] || metric;
  }

  private getDefaultColor(index: number): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    ];
    return colors[index % colors.length];
  }

  private getDefaultColors(count: number): string[] {
    return Array(count).fill(0).map((_, index) => this.getDefaultColor(index));
  }

  private addAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
}
