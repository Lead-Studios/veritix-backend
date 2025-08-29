import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum FraudCaseStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  CONFIRMED_FRAUD = 'confirmed_fraud',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

export enum FraudCaseType {
  PAYMENT_FRAUD = 'payment_fraud',
  ACCOUNT_TAKEOVER = 'account_takeover',
  IDENTITY_THEFT = 'identity_theft',
  CHARGEBACK_FRAUD = 'chargeback_fraud',
  REFUND_ABUSE = 'refund_abuse',
  TICKET_SCALPING = 'ticket_scalping',
  FAKE_ACCOUNT = 'fake_account',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior',
}

export enum FraudCaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('fraud_cases')
@Index(['userId', 'status'])
@Index(['caseType', 'severity'])
@Index(['status', 'createdAt'])
@Index(['riskScore'])
export class FraudCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  transactionId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  organizerId: string;

  @Column({
    type: 'enum',
    enum: FraudCaseType,
  })
  @Index()
  caseType: FraudCaseType;

  @Column({
    type: 'enum',
    enum: FraudCaseStatus,
    default: FraudCaseStatus.PENDING,
  })
  @Index()
  status: FraudCaseStatus;

  @Column({
    type: 'enum',
    enum: FraudCaseSeverity,
    default: FraudCaseSeverity.MEDIUM,
  })
  @Index()
  severity: FraudCaseSeverity;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  @Index()
  riskScore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountInvolved: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  detectionRules: Array<{
    ruleId: string;
    ruleName: string;
    ruleType: string;
    triggered: boolean;
    confidence: number;
    weight: number;
    details: Record<string, any>;
  }>;

  @Column({ type: 'json' })
  behavioralIndicators: {
    velocityAnomalies?: Array<{
      metric: string;
      expected: number;
      actual: number;
      deviation: number;
    }>;
    patternAnomalies?: Array<{
      pattern: string;
      normalBehavior: Record<string, any>;
      currentBehavior: Record<string, any>;
      anomalyScore: number;
    }>;
    deviceAnomalies?: Array<{
      attribute: string;
      previousValue: string;
      currentValue: string;
      riskLevel: string;
    }>;
    locationAnomalies?: Array<{
      type: string;
      previousLocation: string;
      currentLocation: string;
      distance: number;
      timeFrame: number;
    }>;
  };

  @Column({ type: 'json' })
  mlPredictions: {
    models: Array<{
      modelName: string;
      modelVersion: string;
      prediction: number;
      confidence: number;
      features: Record<string, number>;
      explanation: Array<{
        feature: string;
        importance: number;
        value: any;
      }>;
    }>;
    ensembleScore: number;
    ensembleConfidence: number;
  };

  @Column({ type: 'json' })
  deviceFingerprint: {
    fingerprintId: string;
    browserInfo: Record<string, any>;
    deviceInfo: Record<string, any>;
    networkInfo: Record<string, any>;
    behavioralBiometrics: Record<string, any>;
    riskFactors: string[];
  };

  @Column({ type: 'json' })
  externalChecks: {
    blacklistChecks: Array<{
      source: string;
      type: string;
      found: boolean;
      details: Record<string, any>;
    }>;
    velocityChecks: Array<{
      timeWindow: string;
      metric: string;
      threshold: number;
      actual: number;
      exceeded: boolean;
    }>;
    geoChecks: Array<{
      type: string;
      result: string;
      riskLevel: string;
      details: Record<string, any>;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  investigation: {
    assignedTo?: string;
    investigatorNotes?: Array<{
      timestamp: Date;
      investigator: string;
      note: string;
      action: string;
    }>;
    evidence?: Array<{
      type: string;
      description: string;
      url?: string;
      metadata: Record<string, any>;
    }>;
    timeline?: Array<{
      timestamp: Date;
      event: string;
      details: Record<string, any>;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  resolution: {
    resolvedBy?: string;
    resolvedAt?: Date;
    resolution?: string;
    actionsTaken?: string[];
    preventiveMeasures?: string[];
    financialImpact?: {
      lossAmount?: number;
      recoveredAmount?: number;
      preventedLoss?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  relatedCases: Array<{
    caseId: string;
    relationship: string;
    similarity: number;
  }>;

  @Column({ type: 'boolean', default: false })
  isAutomated: boolean;

  @Column({ type: 'boolean', default: false })
  requiresHumanReview: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  reviewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get isHighRisk(): boolean {
    return this.riskScore >= 80;
  }

  get daysSinceCreated(): number {
    return Math.floor((new Date().getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get isOverdue(): boolean {
    const maxDays = this.severity === FraudCaseSeverity.CRITICAL ? 1 : 
                   this.severity === FraudCaseSeverity.HIGH ? 3 : 7;
    return this.daysSinceCreated > maxDays && this.status === FraudCaseStatus.PENDING;
  }

  get investigationProgress(): number {
    if (!this.investigation) return 0;
    
    let progress = 0;
    if (this.investigation.assignedTo) progress += 25;
    if (this.investigation.investigatorNotes?.length > 0) progress += 25;
    if (this.investigation.evidence?.length > 0) progress += 25;
    if (this.status !== FraudCaseStatus.PENDING) progress += 25;
    
    return progress;
  }
}
