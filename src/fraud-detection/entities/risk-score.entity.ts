import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RiskScoreType {
  TRANSACTION = 'transaction',
  USER = 'user',
  DEVICE = 'device',
  SESSION = 'session',
  PAYMENT_METHOD = 'payment_method',
}

export enum RiskCategory {
  IDENTITY = 'identity',
  BEHAVIORAL = 'behavioral',
  DEVICE_BASED = 'device_based',
  LOCATION_BASED = 'location_based',
  VELOCITY = 'velocity',
  NETWORK = 'network',
  PAYMENT = 'payment',
}

@Entity('risk_scores')
@Index(['entityId', 'entityType'])
@Index(['riskScore'])
@Index(['createdAt'])
@Index(['isActive'])
export class RiskScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  entityId: string;

  @Column({
    type: 'enum',
    enum: RiskScoreType,
  })
  @Index()
  entityType: RiskScoreType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  @Index()
  riskScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number;

  @Column({ type: 'json' })
  scoreBreakdown: {
    identity: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    behavioral: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    deviceBased: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    locationBased: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    velocity: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    network: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
    payment: {
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        value: number;
        impact: number;
        description: string;
      }>;
    };
  };

  @Column({ type: 'json' })
  mlPredictions: Array<{
    modelName: string;
    modelVersion: string;
    prediction: number;
    confidence: number;
    features: Record<string, number>;
    shap_values: Record<string, number>;
    explanation: string;
  }>;

  @Column({ type: 'json' })
  ruleResults: Array<{
    ruleId: string;
    ruleName: string;
    ruleType: string;
    triggered: boolean;
    score: number;
    confidence: number;
    parameters: Record<string, any>;
    explanation: string;
  }>;

  @Column({ type: 'json' })
  contextualFactors: {
    timeOfDay: string;
    dayOfWeek: string;
    isHoliday: boolean;
    eventType: string;
    ticketPrice: number;
    paymentMethod: string;
    userTenure: number;
    previousTransactions: number;
    accountAge: number;
    deviceAge: number;
    locationFamiliarity: number;
  };

  @Column({ type: 'json' })
  velocityMetrics: {
    transactionVelocity: {
      last1Hour: number;
      last24Hours: number;
      last7Days: number;
      threshold: number;
      exceeded: boolean;
    };
    amountVelocity: {
      last1Hour: number;
      last24Hours: number;
      last7Days: number;
      threshold: number;
      exceeded: boolean;
    };
    deviceVelocity: {
      uniqueDevices24h: number;
      uniqueDevices7d: number;
      threshold: number;
      exceeded: boolean;
    };
    locationVelocity: {
      uniqueLocations24h: number;
      uniqueLocations7d: number;
      impossibleTravel: boolean;
    };
  };

  @Column({ type: 'json' })
  externalSignals: Array<{
    source: string;
    signalType: string;
    value: any;
    confidence: number;
    timestamp: Date;
    impact: number;
  }>;

  @Column({ type: 'json' })
  historicalComparison: {
    userBaseline: number;
    deviceBaseline: number;
    globalBaseline: number;
    deviationFromUser: number;
    deviationFromDevice: number;
    deviationFromGlobal: number;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  triggeredBy: string;

  @Column({ type: 'json', nullable: true })
  recommendedActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    automated: boolean;
  }>;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get riskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.riskScore >= 90) return 'critical';
    if (this.riskScore >= 70) return 'high';
    if (this.riskScore >= 40) return 'medium';
    return 'low';
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isHighConfidence(): boolean {
    return this.confidence >= 80;
  }

  get topRiskFactors(): Array<{ category: string; score: number; impact: number }> {
    const factors = [];
    
    Object.entries(this.scoreBreakdown).forEach(([category, data]) => {
      if (data.factors && data.factors.length > 0) {
        const topFactor = data.factors.reduce((max, factor) => 
          factor.impact > max.impact ? factor : max
        );
        factors.push({
          category,
          score: data.score,
          impact: topFactor.impact,
        });
      }
    });

    return factors.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  get requiresReview(): boolean {
    return this.riskScore >= 70 || 
           this.velocityMetrics.transactionVelocity.exceeded ||
           this.velocityMetrics.amountVelocity.exceeded ||
           this.velocityMetrics.locationVelocity.impossibleTravel;
  }

  get mlConsensus(): number {
    if (!this.mlPredictions || this.mlPredictions.length === 0) return 0;
    
    const weightedSum = this.mlPredictions.reduce((sum, pred) => 
      sum + (pred.prediction * pred.confidence), 0
    );
    const totalWeight = this.mlPredictions.reduce((sum, pred) => 
      sum + pred.confidence, 0
    );
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}
