import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProjectionModel {
  LINEAR_REGRESSION = 'linear_regression',
  POLYNOMIAL = 'polynomial',
  EXPONENTIAL = 'exponential',
  ARIMA = 'arima',
  LSTM = 'lstm',
  ENSEMBLE = 'ensemble',
  MONTE_CARLO = 'monte_carlo',
}

export enum ProjectionHorizon {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  FINAL = 'final',
}

@Entity('revenue_projection')
@Index(['eventId', 'projectionHorizon', 'timestamp'])
@Index(['timestamp'])
@Index(['model'])
export class RevenueProjection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({
    type: 'enum',
    enum: ProjectionModel,
    default: ProjectionModel.ENSEMBLE,
  })
  @Index()
  model: ProjectionModel;

  @Column({
    type: 'enum',
    enum: ProjectionHorizon,
    default: ProjectionHorizon.FINAL,
  })
  @Index()
  projectionHorizon: ProjectionHorizon;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentRevenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  projectedRevenue: number;

  @Column({ type: 'json' })
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number; // 0.95 for 95% confidence
    intervalWidth: number;
    intervalWidthPercentage: number;
  };

  @Column({ type: 'json' })
  modelMetrics: {
    accuracy: number;
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    r2Score: number; // R-squared
    lastValidationDate: Date;
    trainingDataPoints: number;
    modelVersion: string;
    featureImportance: Array<{
      feature: string;
      importance: number;
      description: string;
    }>;
  };

  @Column({ type: 'json' })
  scenarioAnalysis: {
    scenarios: Array<{
      name: string;
      description: string;
      probability: number;
      projectedRevenue: number;
      assumptions: string[];
      riskFactors: string[];
      opportunities: string[];
    }>;
    bestCase: {
      revenue: number;
      probability: number;
      drivers: string[];
    };
    worstCase: {
      revenue: number;
      probability: number;
      risks: string[];
    };
    mostLikely: {
      revenue: number;
      probability: number;
      factors: string[];
    };
  };

  @Column({ type: 'json' })
  revenueBreakdown: {
    byTier: Array<{
      tierId: string;
      tierName: string;
      currentRevenue: number;
      projectedRevenue: number;
      confidence: number;
      remainingCapacity: number;
      projectedSelloutTime: Date | null;
    }>;
    byChannel: Array<{
      channel: string;
      currentRevenue: number;
      projectedRevenue: number;
      growth: number;
      confidence: number;
    }>;
    byTimeframe: Array<{
      period: string;
      startDate: Date;
      endDate: Date;
      projectedRevenue: number;
      confidence: number;
      milestones: string[];
    }>;
  };

  @Column({ type: 'json' })
  influencingFactors: {
    internal: Array<{
      factor: string;
      impact: number; // -1 to 1
      confidence: number;
      description: string;
      controllable: boolean;
    }>;
    external: Array<{
      factor: string;
      impact: number;
      confidence: number;
      description: string;
      predictability: number;
    }>;
    seasonal: Array<{
      factor: string;
      impact: number;
      seasonality: string;
      historicalPattern: number[];
    }>;
    competitive: Array<{
      competitor: string;
      impact: number;
      marketShare: number;
      threat: number;
    }>;
  };

  @Column({ type: 'json' })
  milestones: {
    revenue: Array<{
      milestone: string;
      targetRevenue: number;
      projectedDate: Date;
      probability: number;
      requirements: string[];
      risks: string[];
    }>;
    capacity: Array<{
      milestone: string;
      targetCapacity: number;
      projectedDate: Date;
      probability: number;
      tier: string;
    }>;
    time: Array<{
      milestone: string;
      date: Date;
      projectedRevenue: number;
      confidence: number;
      significance: string;
    }>;
  };

  @Column({ type: 'json' })
  sensitivityAnalysis: {
    parameters: Array<{
      parameter: string;
      baseValue: number;
      elasticity: number;
      impactOnRevenue: number;
      scenarios: Array<{
        change: number;
        revenueImpact: number;
      }>;
    }>;
    priceElasticity: {
      coefficient: number;
      confidence: number;
      optimalPricePoint: number;
      revenueMaximizingPrice: number;
    };
    marketingElasticity: {
      coefficient: number;
      optimalSpend: number;
      diminishingReturnsPoint: number;
      roi: number;
    };
  };

  @Column({ type: 'json' })
  comparativeAnalysis: {
    historicalEvents: Array<{
      eventId: string;
      eventName: string;
      similarity: number;
      actualRevenue: number;
      projectedRevenue: number;
      accuracy: number;
      lessons: string[];
    }>;
    industryBenchmarks: {
      averageRevenue: number;
      topPercentile: number;
      medianRevenue: number;
      currentPercentile: number;
      projectedPercentile: number;
    };
    competitorComparison: Array<{
      competitor: string;
      estimatedRevenue: number;
      marketShare: number;
      competitiveAdvantage: string[];
    }>;
  };

  @Column({ type: 'json' })
  riskAssessment: {
    risks: Array<{
      risk: string;
      probability: number;
      impact: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      mitigation: string[];
      contingency: string[];
    }>;
    overallRiskScore: number;
    riskCategories: {
      market: number;
      operational: number;
      financial: number;
      competitive: number;
      external: number;
    };
    hedgingStrategies: Array<{
      strategy: string;
      cost: number;
      effectiveness: number;
      implementation: string;
    }>;
  };

  @Column({ type: 'json' })
  optimizationRecommendations: {
    pricing: Array<{
      recommendation: string;
      expectedImpact: number;
      confidence: number;
      implementation: string;
      timeline: string;
    }>;
    marketing: Array<{
      recommendation: string;
      expectedROI: number;
      budget: number;
      channels: string[];
      timeline: string;
    }>;
    capacity: Array<{
      recommendation: string;
      revenueImpact: number;
      cost: number;
      feasibility: number;
      timeline: string;
    }>;
    timing: Array<{
      recommendation: string;
      optimalTiming: Date;
      revenueImpact: number;
      rationale: string;
    }>;
  };

  @Column({ type: 'json' })
  realTimeAdjustments: {
    lastUpdate: Date;
    adjustmentTriggers: Array<{
      trigger: string;
      threshold: number;
      action: string;
      impact: number;
    }>;
    dynamicFactors: Array<{
      factor: string;
      currentValue: number;
      impact: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    modelDrift: {
      detected: boolean;
      severity: number;
      lastRecalibration: Date;
      nextRecalibration: Date;
    };
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracyScore: number;

  @Column({ type: 'int', default: 0 })
  dataPoints: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRecalculated: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get projectionAccuracy(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.accuracyScore >= 90) return 'excellent';
    if (this.accuracyScore >= 75) return 'good';
    if (this.accuracyScore >= 60) return 'fair';
    return 'poor';
  }

  get confidenceLevel(): 'high' | 'medium' | 'low' {
    const intervalWidth = this.confidenceInterval.intervalWidthPercentage;
    
    if (intervalWidth < 10) return 'high';
    if (intervalWidth < 25) return 'medium';
    return 'low';
  }

  get revenueGrowthPotential(): number {
    return this.currentRevenue > 0 
      ? ((this.projectedRevenue - this.currentRevenue) / this.currentRevenue) * 100 
      : 0;
  }

  get timeToTarget(): number | null {
    const targetMilestone = this.milestones.revenue
      .find(m => m.targetRevenue > this.currentRevenue);
    
    if (!targetMilestone) return null;
    
    return Math.ceil(
      (targetMilestone.projectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  get riskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.riskAssessment.overallRiskScore;
    
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'critical';
  }

  get topRisk(): string {
    const risks = this.riskAssessment.risks
      .sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));
    
    return risks[0]?.risk || 'No significant risks identified';
  }

  get bestOpportunity(): string {
    const opportunities = [
      ...this.optimizationRecommendations.pricing,
      ...this.optimizationRecommendations.marketing,
      ...this.optimizationRecommendations.capacity,
    ].sort((a, b) => b.expectedImpact - a.expectedImpact);
    
    return opportunities[0]?.recommendation || 'No optimization opportunities identified';
  }

  get modelReliability(): 'high' | 'medium' | 'low' {
    const metrics = this.modelMetrics;
    const score = (metrics.accuracy + (1 - metrics.mape) + metrics.r2Score) / 3;
    
    if (score > 0.8) return 'high';
    if (score > 0.6) return 'medium';
    return 'low';
  }

  get scenarioSpread(): number {
    const best = this.scenarioAnalysis.bestCase.revenue;
    const worst = this.scenarioAnalysis.worstCase.revenue;
    
    return best > 0 ? ((best - worst) / best) * 100 : 0;
  }

  get capacityConstraints(): Array<{ tier: string; constraint: string; impact: number }> {
    return this.revenueBreakdown.byTier
      .filter(tier => tier.remainingCapacity < tier.currentRevenue * 0.1)
      .map(tier => ({
        tier: tier.tierName,
        constraint: 'Low remaining capacity',
        impact: tier.projectedRevenue - tier.currentRevenue,
      }));
  }

  get marketPosition(): 'leader' | 'strong' | 'average' | 'weak' {
    const percentile = this.comparativeAnalysis.industryBenchmarks.projectedPercentile;
    
    if (percentile >= 90) return 'leader';
    if (percentile >= 70) return 'strong';
    if (percentile >= 40) return 'average';
    return 'weak';
  }

  get nextMilestone(): { name: string; target: number; date: Date; probability: number } | null {
    const upcoming = this.milestones.revenue
      .filter(m => m.targetRevenue > this.currentRevenue)
      .sort((a, b) => a.targetRevenue - b.targetRevenue)[0];
    
    return upcoming ? {
      name: upcoming.milestone,
      target: upcoming.targetRevenue,
      date: upcoming.projectedDate,
      probability: upcoming.probability,
    } : null;
  }

  get optimizationPotential(): number {
    const recommendations = [
      ...this.optimizationRecommendations.pricing,
      ...this.optimizationRecommendations.marketing,
      ...this.optimizationRecommendations.capacity,
    ];
    
    return recommendations.reduce((total, rec) => total + rec.expectedImpact, 0);
  }

  get modelFreshness(): 'fresh' | 'stale' | 'outdated' {
    if (!this.lastRecalculated) return 'outdated';
    
    const hoursOld = (Date.now() - this.lastRecalculated.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld < 1) return 'fresh';
    if (hoursOld < 6) return 'stale';
    return 'outdated';
  }
}
