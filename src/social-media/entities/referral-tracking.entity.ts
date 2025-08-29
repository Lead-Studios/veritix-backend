import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReferralProgram } from './referral-program.entity';
import { ReferralCode } from './referral-code.entity';

export enum TrackingStatus {
  PENDING = 'pending',
  CLICKED = 'clicked',
  REGISTERED = 'registered',
  CONVERTED = 'converted',
  REWARDED = 'rewarded',
  FAILED = 'failed',
  FRAUDULENT = 'fraudulent',
}

export enum ConversionType {
  REGISTRATION = 'registration',
  PURCHASE = 'purchase',
  SUBSCRIPTION = 'subscription',
  BOOKING = 'booking',
  DOWNLOAD = 'download',
  CUSTOM = 'custom',
}

@Entity('referral_tracking')
@Index(['programId', 'status'])
@Index(['referralCodeId', 'status'])
@Index(['referrerId', 'refereeId'])
@Index(['sessionId'])
export class ReferralTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  programId: string;

  @Column({ type: 'uuid' })
  @Index()
  referralCodeId: string;

  @Column({ type: 'uuid' })
  @Index()
  referrerId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  refereeId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  sessionId: string;

  @Column({
    type: 'enum',
    enum: TrackingStatus,
    default: TrackingStatus.PENDING,
  })
  @Index()
  status: TrackingStatus;

  @Column({
    type: 'enum',
    enum: ConversionType,
    nullable: true,
  })
  conversionType: ConversionType;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  medium: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campaign: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  term: string;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  registeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rewardedAt: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  conversionValue: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  conversionCurrency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  rewardAmount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  rewardCurrency: string;

  @Column({ type: 'json', nullable: true })
  deviceInfo: {
    deviceType?: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
  };

  @Column({ type: 'json', nullable: true })
  locationInfo: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };

  @Column({ type: 'json', nullable: true })
  fraudDetection: {
    riskScore?: number;
    flags?: string[];
    ipReputation?: string;
    deviceFingerprint?: string;
    behaviorAnalysis?: {
      timeOnSite?: number;
      pageViews?: number;
      bounceRate?: number;
      suspiciousActivity?: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  conversionData: {
    orderId?: string;
    productIds?: string[];
    categoryIds?: string[];
    quantity?: number;
    discountAmount?: number;
    taxAmount?: number;
    shippingAmount?: number;
    customFields?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  attributionData: {
    firstTouch?: boolean;
    lastTouch?: boolean;
    touchpointSequence?: number;
    attributionWeight?: number;
    crossDevice?: boolean;
    assistedConversion?: boolean;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ReferralProgram, (program) => program.trackings)
  @JoinColumn({ name: 'programId' })
  program: ReferralProgram;

  @ManyToOne(() => ReferralCode, (code) => code.trackings)
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode;

  // Virtual fields
  get timeToConversion(): number {
    if (!this.clickedAt || !this.convertedAt) return 0;
    return this.convertedAt.getTime() - this.clickedAt.getTime();
  }

  get isConverted(): boolean {
    return this.status === TrackingStatus.CONVERTED || this.status === TrackingStatus.REWARDED;
  }

  get isFraudulent(): boolean {
    return this.status === TrackingStatus.FRAUDULENT;
  }

  get riskScore(): number {
    return this.fraudDetection?.riskScore || 0;
  }
}
