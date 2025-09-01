import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbTestExperiment, ExperimentStatus, ExperimentType } from '../entities/ab-test-experiment.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationAnalytics, MetricType } from '../entities/recommendation-analytics.entity';

export interface ExperimentConfig {
  name: string;
  description?: string;
  experimentType: ExperimentType;
  variants: Array<{
    name: string;
    config: Record<string, any>;
    trafficPercentage: number;
  }>;
  targetMetrics: string[];
  startDate: Date;
  endDate: Date;
  minimumSampleSize?: number;
  significanceLevel?: number;
}

export interface ExperimentResult {
  experimentId: string;
  winningVariant: string;
  confidenceLevel: number;
  metrics: Record<string, any>;
  statisticalSignificance: boolean;
}

@Injectable()
export class ABTestingService {
  constructor(
    @InjectRepository(AbTestExperiment)
    private experimentRepository: Repository<AbTestExperiment>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationAnalytics)
    private analyticsRepository: Repository<RecommendationAnalytics>,
  ) {}

  async createExperiment(config: ExperimentConfig): Promise<AbTestExperiment> {
    // Validate traffic allocation
    const totalTraffic = config.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Traffic allocation must sum to 100%');
    }

    const experiment = this.experimentRepository.create({
      name: config.name,
      description: config.description,
      experimentType: config.experimentType,
      variants: config.variants,
      trafficAllocation: config.variants.reduce((acc, v) => {
        acc[v.name] = v.trafficPercentage;
        return acc;
      }, {}),
      targetMetrics: config.targetMetrics,
      startDate: config.startDate,
      endDate: config.endDate,
      minimumSampleSize: config.minimumSampleSize || 1000,
      significanceLevel: config.significanceLevel || 0.05,
      status: ExperimentStatus.DRAFT,
    });

    return this.experimentRepository.save(experiment);
  }

  async startExperiment(experimentId: string): Promise<void> {
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.startDate > new Date()) {
      throw new Error('Experiment start date is in the future');
    }

    await this.experimentRepository.update(experimentId, {
      status: ExperimentStatus.RUNNING,
    });
  }

  async assignUserToVariant(userId: string, experimentId: string): Promise<string> {
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId, status: ExperimentStatus.RUNNING },
    });

    if (!experiment) {
      return 'control'; // Default variant
    }

    // Check if experiment is active
    const now = new Date();
    if (now < experiment.startDate || now > experiment.endDate) {
      return 'control';
    }

    // Deterministic assignment based on user ID hash
    const hash = this.hashUserId(userId, experimentId);
    const variants = Object.entries(experiment.trafficAllocation);
    
    let cumulativePercentage = 0;
    for (const [variantName, percentage] of variants) {
      cumulativePercentage += percentage;
      if (hash <= cumulativePercentage) {
        return variantName;
      }
    }

    return variants[0][0]; // Fallback to first variant
  }

  async getVariantConfig(experimentId: string, variantName: string): Promise<Record<string, any>> {
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId },
    });

    if (!experiment) {
      return {};
    }

    const variant = experiment.variants.find(v => v.name === variantName);
    return variant?.config || {};
  }

  async recordExperimentMetric(
    experimentId: string,
    variantName: string,
    metricType: MetricType,
    value: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const analytics = this.analyticsRepository.create({
      modelId: experimentId, // Using modelId field for experiment ID
      metricType,
      value,
      date: new Date(),
      abTestGroup: variantName,
      metadata,
    });

    await this.analyticsRepository.save(analytics);
  }

  async analyzeExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Get metrics for all variants
    const variantMetrics = new Map<string, Record<string, number>>();

    for (const variant of experiment.variants) {
      const metrics = await this.getVariantMetrics(experimentId, variant.name);
      variantMetrics.set(variant.name, metrics);
    }

    // Determine winning variant
    const winningVariant = this.determineWinningVariant(variantMetrics, experiment.targetMetrics);
    
    // Calculate statistical significance
    const significance = await this.calculateStatisticalSignificance(
      experimentId,
      winningVariant,
      experiment.targetMetrics[0],
    );

    const result: ExperimentResult = {
      experimentId,
      winningVariant,
      confidenceLevel: significance.confidenceLevel,
      metrics: Object.fromEntries(variantMetrics),
      statisticalSignificance: significance.isSignificant,
    };

    // Update experiment with results
    await this.experimentRepository.update(experimentId, {
      results: result,
      winningVariant,
      confidenceLevel: significance.confidenceLevel,
      conclusion: this.generateConclusion(result),
    });

    return result;
  }

  private async getVariantMetrics(
    experimentId: string,
    variantName: string,
  ): Promise<Record<string, number>> {
    const metrics = await this.analyticsRepository.find({
      where: {
        modelId: experimentId,
        abTestGroup: variantName,
      },
    });

    const result: Record<string, number> = {};

    for (const metric of metrics) {
      const key = metric.metricType;
      if (!result[key]) {
        result[key] = 0;
      }
      result[key] += metric.value;
    }

    // Calculate rates
    const totalRecs = metrics.filter(m => m.metricType === MetricType.CLICK_THROUGH_RATE).length;
    if (totalRecs > 0) {
      result.click_through_rate = result.click_through_rate / totalRecs;
      result.conversion_rate = result.conversion_rate / totalRecs;
    }

    return result;
  }

  private determineWinningVariant(
    variantMetrics: Map<string, Record<string, number>>,
    targetMetrics: string[],
  ): string {
    let bestVariant = '';
    let bestScore = -1;

    for (const [variantName, metrics] of variantMetrics) {
      let score = 0;
      
      for (const metric of targetMetrics) {
        score += metrics[metric] || 0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVariant = variantName;
      }
    }

    return bestVariant;
  }

  private async calculateStatisticalSignificance(
    experimentId: string,
    winningVariant: string,
    primaryMetric: string,
  ): Promise<{ isSignificant: boolean; confidenceLevel: number }> {
    // Simplified statistical significance calculation
    // In production, would use proper statistical tests (t-test, chi-square, etc.)
    
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId },
    });

    const sampleSize = await this.recommendationRepository.count({
      where: { abTestGroup: winningVariant },
    });

    const minimumSample = experiment?.minimumSampleSize || 1000;
    const isSignificant = sampleSize >= minimumSample;
    
    // Mock confidence level calculation
    const confidenceLevel = Math.min(0.95, 0.5 + (sampleSize / minimumSample) * 0.45);

    return {
      isSignificant,
      confidenceLevel,
    };
  }

  private generateConclusion(result: ExperimentResult): string {
    const { winningVariant, confidenceLevel, statisticalSignificance } = result;
    
    if (statisticalSignificance) {
      return `Variant "${winningVariant}" is the winner with ${(confidenceLevel * 100).toFixed(1)}% confidence. Results are statistically significant.`;
    } else {
      return `Variant "${winningVariant}" shows promise but results are not yet statistically significant. Continue experiment or increase sample size.`;
    }
  }

  private hashUserId(userId: string, experimentId: string): number {
    const combined = `${userId}:${experimentId}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100; // Return 0-99
  }

  async getActiveExperiments(): Promise<AbTestExperiment[]> {
    const now = new Date();
    
    return this.experimentRepository.find({
      where: {
        status: ExperimentStatus.RUNNING,
      },
      order: { startDate: 'DESC' },
    });
  }

  async stopExperiment(experimentId: string): Promise<void> {
    await this.experimentRepository.update(experimentId, {
      status: ExperimentStatus.COMPLETED,
    });

    // Analyze final results
    await this.analyzeExperiment(experimentId);
  }

  async getExperimentReport(experimentId: string): Promise<Record<string, any>> {
    const experiment = await this.experimentRepository.findOne({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const analytics = await this.analyticsRepository.find({
      where: { modelId: experimentId },
      order: { date: 'ASC' },
    });

    return {
      experiment,
      analytics,
      summary: experiment.results,
      conclusion: experiment.conclusion,
    };
  }
}
