import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { FraudCase, FraudStatus, FraudType } from '../entities/fraud-case.entity';
import { RiskScore, RiskScoreType } from '../entities/risk-score.entity';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';
import { BehavioralPattern } from '../entities/behavioral-pattern.entity';

export interface FraudDashboardData {
  overview: {
    totalCases: number;
    activeCases: number;
    resolvedCases: number;
    falsePositives: number;
    confirmedFraud: number;
    detectionRate: number;
    falsePositiveRate: number;
    averageResolutionTime: number;
  };
  trends: {
    dailyCases: Array<{ date: string; count: number; confirmed: number }>;
    weeklyTrends: Array<{ week: string; cases: number; amount: number }>;
    monthlyStats: Array<{ month: string; cases: number; savings: number }>;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  fraudTypes: Array<{ type: string; count: number; percentage: number }>;
  topRiskFactors: Array<{ factor: string; frequency: number; impact: number }>;
  geographicDistribution: Array<{ country: string; cases: number; riskScore: number }>;
  deviceAnalytics: {
    totalDevices: number;
    highRiskDevices: number;
    blockedDevices: number;
    deviceTypes: Array<{ type: string; count: number; riskScore: number }>;
  };
}

export interface FraudPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectionAccuracy: number;
  characteristics: Array<{
    attribute: string;
    value: any;
    weight: number;
  }>;
  timeline: Array<{
    date: string;
    occurrences: number;
  }>;
  relatedCases: string[];
}

export interface AlertConfiguration {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains' | 'in';
    value: any;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  recipients: string[];
  cooldownMinutes: number;
}

@Injectable()
export class FraudAnalyticsService {
  private readonly logger = new Logger(FraudAnalyticsService.name);

  constructor(
    @InjectRepository(FraudCase)
    private fraudCaseRepository: Repository<FraudCase>,
    @InjectRepository(RiskScore)
    private riskScoreRepository: Repository<RiskScore>,
    @InjectRepository(DeviceFingerprint)
    private deviceFingerprintRepository: Repository<DeviceFingerprint>,
    @InjectRepository(BehavioralPattern)
    private behavioralPatternRepository: Repository<BehavioralPattern>,
  ) {}

  async getDashboardData(timeRange: 'day' | 'week' | 'month' | 'quarter' = 'month'): Promise<FraudDashboardData> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      const [
        overview,
        trends,
        riskDistribution,
        fraudTypes,
        topRiskFactors,
        geographicDistribution,
        deviceAnalytics,
      ] = await Promise.all([
        this.getOverviewStats(startDate, endDate),
        this.getTrendAnalysis(startDate, endDate),
        this.getRiskDistribution(startDate, endDate),
        this.getFraudTypeDistribution(startDate, endDate),
        this.getTopRiskFactors(startDate, endDate),
        this.getGeographicDistribution(startDate, endDate),
        this.getDeviceAnalytics(startDate, endDate),
      ]);

      return {
        overview,
        trends,
        riskDistribution,
        fraudTypes,
        topRiskFactors,
        geographicDistribution,
        deviceAnalytics,
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard data: ${error.message}`, error.stack);
      throw error;
    }
  }

  async identifyFraudPatterns(minFrequency: number = 5): Promise<FraudPattern[]> {
    try {
      this.logger.log('Identifying fraud patterns');

      const fraudCases = await this.fraudCaseRepository.find({
        where: { 
          status: FraudStatus.CONFIRMED,
          createdAt: MoreThan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        },
        order: { createdAt: 'DESC' },
      });

      const patterns = await this.analyzePatterns(fraudCases, minFrequency);
      return patterns;
    } catch (error) {
      this.logger.error(`Error identifying fraud patterns: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAnomalyDetection(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<Array<{
    timestamp: Date;
    metric: string;
    value: number;
    expected: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>> {
    try {
      const anomalies = [];
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      // Detect transaction volume anomalies
      const volumeAnomalies = await this.detectVolumeAnomalies(startDate, endDate);
      anomalies.push(...volumeAnomalies);

      // Detect risk score anomalies
      const riskAnomalies = await this.detectRiskScoreAnomalies(startDate, endDate);
      anomalies.push(...riskAnomalies);

      // Detect geographic anomalies
      const geoAnomalies = await this.detectGeographicAnomalies(startDate, endDate);
      anomalies.push(...geoAnomalies);

      return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.logger.error(`Error detecting anomalies: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateFraudReport(
    startDate: Date,
    endDate: Date,
    includeDetails: boolean = false
  ): Promise<{
    summary: Record<string, any>;
    metrics: Record<string, any>;
    recommendations: string[];
    details?: Record<string, any>;
  }> {
    try {
      const [summary, metrics] = await Promise.all([
        this.generateReportSummary(startDate, endDate),
        this.generateReportMetrics(startDate, endDate),
      ]);

      const recommendations = this.generateRecommendations(summary, metrics);
      
      const report: any = {
        summary,
        metrics,
        recommendations,
      };

      if (includeDetails) {
        report.details = await this.generateReportDetails(startDate, endDate);
      }

      return report;
    } catch (error) {
      this.logger.error(`Error generating fraud report: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getOverviewStats(startDate: Date, endDate: Date): Promise<FraudDashboardData['overview']> {
    const totalCases = await this.fraudCaseRepository.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const activeCases = await this.fraudCaseRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        status: FraudStatus.DETECTED,
      },
    });

    const resolvedCases = await this.fraudCaseRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        status: FraudStatus.RESOLVED,
      },
    });

    const falsePositives = await this.fraudCaseRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        status: FraudStatus.FALSE_POSITIVE,
      },
    });

    const confirmedFraud = await this.fraudCaseRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        status: FraudStatus.CONFIRMED,
      },
    });

    const detectionRate = totalCases > 0 ? (confirmedFraud / totalCases) * 100 : 0;
    const falsePositiveRate = totalCases > 0 ? (falsePositives / totalCases) * 100 : 0;

    // Calculate average resolution time
    const resolvedWithTime = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('AVG(EXTRACT(EPOCH FROM (fraud.resolvedAt - fraud.createdAt)))', 'avgTime')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('fraud.resolvedAt IS NOT NULL')
      .getRawOne();

    const averageResolutionTime = resolvedWithTime?.avgTime ? 
      Math.round(resolvedWithTime.avgTime / 3600) : 0; // Convert to hours

    return {
      totalCases,
      activeCases,
      resolvedCases,
      falsePositives,
      confirmedFraud,
      detectionRate,
      falsePositiveRate,
      averageResolutionTime,
    };
  }

  private async getTrendAnalysis(startDate: Date, endDate: Date): Promise<FraudDashboardData['trends']> {
    // Daily cases trend
    const dailyCases = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('DATE(fraud.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN fraud.status = :confirmed THEN 1 ELSE 0 END)', 'confirmed')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate, confirmed: FraudStatus.CONFIRMED })
      .groupBy('DATE(fraud.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Weekly trends
    const weeklyTrends = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('DATE_TRUNC(\'week\', fraud.createdAt)', 'week')
      .addSelect('COUNT(*)', 'cases')
      .addSelect('COALESCE(SUM(fraud.transactionAmount), 0)', 'amount')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE_TRUNC(\'week\', fraud.createdAt)')
      .orderBy('week', 'ASC')
      .getRawMany();

    // Monthly stats with estimated savings
    const monthlyStats = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('DATE_TRUNC(\'month\', fraud.createdAt)', 'month')
      .addSelect('COUNT(*)', 'cases')
      .addSelect('COALESCE(SUM(CASE WHEN fraud.status = :confirmed THEN fraud.transactionAmount ELSE 0 END), 0)', 'savings')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate, confirmed: FraudStatus.CONFIRMED })
      .groupBy('DATE_TRUNC(\'month\', fraud.createdAt)')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      dailyCases: dailyCases.map(d => ({
        date: d.date,
        count: parseInt(d.count),
        confirmed: parseInt(d.confirmed),
      })),
      weeklyTrends: weeklyTrends.map(w => ({
        week: w.week,
        cases: parseInt(w.cases),
        amount: parseFloat(w.amount),
      })),
      monthlyStats: monthlyStats.map(m => ({
        month: m.month,
        cases: parseInt(m.cases),
        savings: parseFloat(m.savings),
      })),
    };
  }

  private async getRiskDistribution(startDate: Date, endDate: Date): Promise<FraudDashboardData['riskDistribution']> {
    const distribution = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('CASE ' +
        'WHEN fraud.riskScore >= 80 THEN \'critical\' ' +
        'WHEN fraud.riskScore >= 60 THEN \'high\' ' +
        'WHEN fraud.riskScore >= 30 THEN \'medium\' ' +
        'ELSE \'low\' END', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('riskLevel')
      .getRawMany();

    const result = { low: 0, medium: 0, high: 0, critical: 0 };
    distribution.forEach(d => {
      result[d.riskLevel as keyof typeof result] = parseInt(d.count);
    });

    return result;
  }

  private async getFraudTypeDistribution(startDate: Date, endDate: Date): Promise<FraudDashboardData['fraudTypes']> {
    const types = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .select('fraud.fraudType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('fraud.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('fraud.fraudType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = types.reduce((sum, t) => sum + parseInt(t.count), 0);

    return types.map(t => ({
      type: t.type,
      count: parseInt(t.count),
      percentage: total > 0 ? (parseInt(t.count) / total) * 100 : 0,
    }));
  }

  private async getTopRiskFactors(startDate: Date, endDate: Date): Promise<FraudDashboardData['topRiskFactors']> {
    // Mock implementation - in production, analyze actual risk factors from cases
    return [
      { factor: 'High velocity transactions', frequency: 45, impact: 85 },
      { factor: 'New device usage', frequency: 38, impact: 70 },
      { factor: 'Unusual location', frequency: 32, impact: 75 },
      { factor: 'Behavioral anomaly', frequency: 28, impact: 80 },
      { factor: 'Proxy/VPN usage', frequency: 25, impact: 90 },
    ];
  }

  private async getGeographicDistribution(startDate: Date, endDate: Date): Promise<FraudDashboardData['geographicDistribution']> {
    // Mock implementation - in production, analyze actual geographic data
    return [
      { country: 'US', cases: 125, riskScore: 45 },
      { country: 'CA', cases: 89, riskScore: 38 },
      { country: 'GB', cases: 67, riskScore: 42 },
      { country: 'DE', cases: 54, riskScore: 35 },
      { country: 'FR', cases: 43, riskScore: 40 },
    ];
  }

  private async getDeviceAnalytics(startDate: Date, endDate: Date): Promise<FraudDashboardData['deviceAnalytics']> {
    const totalDevices = await this.deviceFingerprintRepository.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const highRiskDevices = await this.deviceFingerprintRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        riskScore: MoreThan(70),
      },
    });

    const blockedDevices = await this.deviceFingerprintRepository.count({
      where: { 
        createdAt: Between(startDate, endDate),
        status: 'blocked',
      },
    });

    // Mock device types - in production, analyze actual device data
    const deviceTypes = [
      { type: 'Desktop', count: 156, riskScore: 35 },
      { type: 'Mobile', count: 234, riskScore: 42 },
      { type: 'Tablet', count: 78, riskScore: 38 },
    ];

    return {
      totalDevices,
      highRiskDevices,
      blockedDevices,
      deviceTypes,
    };
  }

  private async analyzePatterns(fraudCases: FraudCase[], minFrequency: number): Promise<FraudPattern[]> {
    const patterns: FraudPattern[] = [];

    // Analyze amount patterns
    const amountPattern = this.analyzeAmountPatterns(fraudCases);
    if (amountPattern.frequency >= minFrequency) {
      patterns.push(amountPattern);
    }

    // Analyze time patterns
    const timePattern = this.analyzeTimePatterns(fraudCases);
    if (timePattern.frequency >= minFrequency) {
      patterns.push(timePattern);
    }

    // Analyze location patterns
    const locationPattern = this.analyzeLocationPatterns(fraudCases);
    if (locationPattern.frequency >= minFrequency) {
      patterns.push(locationPattern);
    }

    return patterns;
  }

  private analyzeAmountPatterns(fraudCases: FraudCase[]): FraudPattern {
    const roundAmounts = fraudCases.filter(c => 
      c.transactionAmount && c.transactionAmount % 100 === 0
    );

    return {
      id: 'round-amounts',
      name: 'Round Amount Transactions',
      description: 'Transactions with round amounts (multiples of 100)',
      frequency: roundAmounts.length,
      riskLevel: 'medium',
      detectionAccuracy: 75,
      characteristics: [
        { attribute: 'amount_modulo_100', value: 0, weight: 80 },
        { attribute: 'amount_range', value: '1000-5000', weight: 60 },
      ],
      timeline: this.generateTimeline(roundAmounts),
      relatedCases: roundAmounts.map(c => c.id),
    };
  }

  private analyzeTimePatterns(fraudCases: FraudCase[]): FraudPattern {
    const offHoursCases = fraudCases.filter(c => {
      const hour = c.createdAt.getHours();
      return hour >= 2 && hour <= 6;
    });

    return {
      id: 'off-hours',
      name: 'Off-Hours Activity',
      description: 'Fraudulent activity during unusual hours (2-6 AM)',
      frequency: offHoursCases.length,
      riskLevel: 'high',
      detectionAccuracy: 85,
      characteristics: [
        { attribute: 'hour_range', value: '2-6', weight: 90 },
        { attribute: 'day_type', value: 'weekday', weight: 70 },
      ],
      timeline: this.generateTimeline(offHoursCases),
      relatedCases: offHoursCases.map(c => c.id),
    };
  }

  private analyzeLocationPatterns(fraudCases: FraudCase[]): FraudPattern {
    const foreignCases = fraudCases.filter(c => 
      c.location && c.location.country !== 'US'
    );

    return {
      id: 'foreign-transactions',
      name: 'Foreign Transactions',
      description: 'Transactions from foreign countries',
      frequency: foreignCases.length,
      riskLevel: 'medium',
      detectionAccuracy: 70,
      characteristics: [
        { attribute: 'country', value: 'non-US', weight: 75 },
        { attribute: 'new_location', value: true, weight: 85 },
      ],
      timeline: this.generateTimeline(foreignCases),
      relatedCases: foreignCases.map(c => c.id),
    };
  }

  private generateTimeline(cases: FraudCase[]): Array<{ date: string; occurrences: number }> {
    const timeline: Record<string, number> = {};
    
    cases.forEach(c => {
      const date = c.createdAt.toISOString().split('T')[0];
      timeline[date] = (timeline[date] || 0) + 1;
    });

    return Object.entries(timeline).map(([date, occurrences]) => ({
      date,
      occurrences,
    }));
  }

  private async detectVolumeAnomalies(startDate: Date, endDate: Date): Promise<any[]> {
    // Mock volume anomaly detection
    return [
      {
        timestamp: new Date(),
        metric: 'transaction_volume',
        value: 150,
        expected: 100,
        deviation: 50,
        severity: 'medium' as const,
        description: 'Transaction volume 50% above expected baseline',
      },
    ];
  }

  private async detectRiskScoreAnomalies(startDate: Date, endDate: Date): Promise<any[]> {
    // Mock risk score anomaly detection
    return [
      {
        timestamp: new Date(),
        metric: 'average_risk_score',
        value: 75,
        expected: 45,
        deviation: 30,
        severity: 'high' as const,
        description: 'Average risk score significantly elevated',
      },
    ];
  }

  private async detectGeographicAnomalies(startDate: Date, endDate: Date): Promise<any[]> {
    // Mock geographic anomaly detection
    return [
      {
        timestamp: new Date(),
        metric: 'geographic_spread',
        value: 25,
        expected: 15,
        deviation: 10,
        severity: 'low' as const,
        description: 'Unusual geographic distribution of transactions',
      },
    ];
  }

  private async generateReportSummary(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    const overview = await this.getOverviewStats(startDate, endDate);
    
    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalCases: overview.totalCases,
      fraudPrevented: overview.confirmedFraud,
      estimatedSavings: overview.confirmedFraud * 1500, // Estimated average fraud amount
      systemEfficiency: overview.detectionRate,
      falsePositiveRate: overview.falsePositiveRate,
    };
  }

  private async generateReportMetrics(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    return {
      detectionMetrics: {
        totalAlerts: 450,
        truePositives: 125,
        falsePositives: 45,
        precision: 73.5,
        recall: 89.2,
      },
      performanceMetrics: {
        averageProcessingTime: 2.3,
        systemUptime: 99.8,
        alertResponseTime: 15.2,
      },
      businessImpact: {
        fraudPrevented: 187500,
        operationalCost: 12500,
        roi: 1400,
      },
    };
  }

  private generateRecommendations(summary: Record<string, any>, metrics: Record<string, any>): string[] {
    const recommendations = [];

    if (summary.falsePositiveRate > 10) {
      recommendations.push('Consider tuning detection rules to reduce false positive rate');
    }

    if (metrics.detectionMetrics.precision < 80) {
      recommendations.push('Improve model precision through additional training data');
    }

    if (metrics.performanceMetrics.averageProcessingTime > 5) {
      recommendations.push('Optimize processing pipeline for better performance');
    }

    recommendations.push('Continue monitoring emerging fraud patterns');
    recommendations.push('Regular review and update of detection rules');

    return recommendations;
  }

  private async generateReportDetails(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    return {
      topFraudTypes: await this.getFraudTypeDistribution(startDate, endDate),
      riskDistribution: await this.getRiskDistribution(startDate, endDate),
      geographicAnalysis: await this.getGeographicDistribution(startDate, endDate),
      deviceAnalysis: await this.getDeviceAnalytics(startDate, endDate),
    };
  }

  private getStartDate(endDate: Date, timeRange: string): Date {
    const start = new Date(endDate);
    
    switch (timeRange) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
    
    return start;
  }
}
