import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PatternType {
  PURCHASE_VELOCITY = 'purchase_velocity',
  LOGIN_PATTERN = 'login_pattern',
  BROWSING_BEHAVIOR = 'browsing_behavior',
  PAYMENT_METHOD = 'payment_method',
  DEVICE_USAGE = 'device_usage',
  LOCATION_PATTERN = 'location_pattern',
  TIME_PATTERN = 'time_pattern',
  INTERACTION_PATTERN = 'interaction_pattern',
}

export enum PatternStatus {
  LEARNING = 'learning',
  ESTABLISHED = 'established',
  ANOMALOUS = 'anomalous',
  SUSPICIOUS = 'suspicious',
}

@Entity('behavioral_patterns')
@Index(['userId', 'patternType'])
@Index(['status', 'anomalyScore'])
@Index(['createdAt'])
export class BehavioralPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: PatternType,
  })
  @Index()
  patternType: PatternType;

  @Column({
    type: 'enum',
    enum: PatternStatus,
    default: PatternStatus.LEARNING,
  })
  @Index()
  status: PatternStatus;

  @Column({ type: 'json' })
  baselineMetrics: {
    averageTransactionAmount?: number;
    averageTransactionFrequency?: number;
    commonTransactionTimes?: string[];
    commonLocations?: Array<{
      country: string;
      city: string;
      frequency: number;
    }>;
    commonDevices?: Array<{
      deviceType: string;
      browser: string;
      os: string;
      frequency: number;
    }>;
    commonPaymentMethods?: Array<{
      type: string;
      lastFour: string;
      frequency: number;
    }>;
    sessionDuration?: {
      average: number;
      median: number;
      standardDeviation: number;
    };
    clickPatterns?: {
      averageClicksPerSession: number;
      commonClickSequences: string[];
      typingSpeed: number;
    };
  };

  @Column({ type: 'json' })
  currentMetrics: {
    recentTransactionAmount?: number;
    recentTransactionFrequency?: number;
    recentTransactionTimes?: string[];
    recentLocations?: Array<{
      country: string;
      city: string;
      timestamp: Date;
    }>;
    recentDevices?: Array<{
      deviceType: string;
      browser: string;
      os: string;
      timestamp: Date;
    }>;
    recentPaymentMethods?: Array<{
      type: string;
      lastFour: string;
      timestamp: Date;
    }>;
    recentSessionDuration?: number;
    recentClickPatterns?: {
      clicksPerSession: number;
      clickSequences: string[];
      typingSpeed: number;
    };
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @Index()
  anomalyScore: number;

  @Column({ type: 'json' })
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    detectedAt: Date;
    metrics: {
      expected: any;
      actual: any;
      deviation: number;
    };
  }>;

  @Column({ type: 'json' })
  mlFeatures: {
    statisticalFeatures: Record<string, number>;
    temporalFeatures: Record<string, number>;
    behavioralFeatures: Record<string, number>;
    contextualFeatures: Record<string, number>;
  };

  @Column({ type: 'int', default: 0 })
  dataPoints: number;

  @Column({ type: 'int', default: 0 })
  anomalousEvents: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAnalyzedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAnomalyAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get anomalyRate(): number {
    return this.dataPoints > 0 ? (this.anomalousEvents / this.dataPoints) * 100 : 0;
  }

  get isEstablished(): boolean {
    return this.status === PatternStatus.ESTABLISHED && this.dataPoints >= 50;
  }

  get riskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.anomalyScore >= 90) return 'critical';
    if (this.anomalyScore >= 70) return 'high';
    if (this.anomalyScore >= 40) return 'medium';
    return 'low';
  }

  get daysSinceLastAnomaly(): number {
    if (!this.lastAnomalyAt) return -1;
    return Math.floor((new Date().getTime() - this.lastAnomalyAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}
