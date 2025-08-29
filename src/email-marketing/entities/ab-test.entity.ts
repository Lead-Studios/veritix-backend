import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailCampaign } from './email-campaign.entity';
import { TestVariant } from './test-variant.entity';

export enum TestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum TestType {
  SUBJECT_LINE = 'subject_line',
  FROM_NAME = 'from_name',
  CONTENT = 'content',
  SEND_TIME = 'send_time',
  TEMPLATE = 'template',
  CALL_TO_ACTION = 'call_to_action',
  MULTIVARIATE = 'multivariate',
}

export enum WinningCriteria {
  OPEN_RATE = 'open_rate',
  CLICK_RATE = 'click_rate',
  CONVERSION_RATE = 'conversion_rate',
  REVENUE = 'revenue',
  UNSUBSCRIBE_RATE = 'unsubscribe_rate',
  CUSTOM = 'custom',
}

@Entity('ab_tests')
@Index(['campaignId', 'status'])
@Index(['testType', 'status'])
export class ABTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  campaignId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TestType,
  })
  testType: TestType;

  @Column({
    type: 'enum',
    enum: TestStatus,
    default: TestStatus.DRAFT,
  })
  status: TestStatus;

  @Column({
    type: 'enum',
    enum: WinningCriteria,
  })
  winningCriteria: WinningCriteria;

  @Column({ type: 'int', default: 50 })
  testPercentage: number; // Percentage of audience to include in test

  @Column({ type: 'int', default: 24 })
  testDurationHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 95 })
  confidenceLevel: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  winningVariantId: string;

  @Column({ type: 'boolean', default: false })
  isStatisticallySignificant: boolean;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  pValue: number;

  @Column({ type: 'json', nullable: true })
  results: {
    totalParticipants: number;
    variantResults: {
      variantId: string;
      participants: number;
      opens: number;
      clicks: number;
      conversions: number;
      revenue: number;
      unsubscribes: number;
      openRate: number;
      clickRate: number;
      conversionRate: number;
      unsubscribeRate: number;
    }[];
    winnerLift: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  settings: {
    autoSelectWinner?: boolean;
    minimumSampleSize?: number;
    maximumDuration?: {
      value: number;
      unit: 'hours' | 'days';
    };
    earlyStoppingRules?: {
      enabled: boolean;
      minimumRunTime: number;
      significanceThreshold: number;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailCampaign, (campaign) => campaign.abTests)
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;

  @OneToMany(() => TestVariant, (variant) => variant.test)
  variants: TestVariant[];
}
