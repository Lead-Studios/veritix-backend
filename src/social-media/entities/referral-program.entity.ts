import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReferralCode } from './referral-code.entity';
import { ReferralTracking } from './referral-tracking.entity';

export enum ProgramStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

export enum RewardType {
  DISCOUNT_PERCENTAGE = 'discount_percentage',
  DISCOUNT_FIXED = 'discount_fixed',
  FREE_TICKET = 'free_ticket',
  CASHBACK = 'cashback',
  POINTS = 'points',
  MERCHANDISE = 'merchandise',
  VIP_ACCESS = 'vip_access',
}

@Entity('referral_programs')
@Index(['organizerId', 'status'])
@Index(['eventId', 'status'])
export class ReferralProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProgramStatus,
    default: ProgramStatus.DRAFT,
  })
  @Index()
  status: ProgramStatus;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  rewardType: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rewardValue: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  rewardCurrency: string;

  @Column({ type: 'json', nullable: true })
  referrerReward: {
    type: RewardType;
    value: number;
    currency?: string;
    description?: string;
  };

  @Column({ type: 'json', nullable: true })
  refereeReward: {
    type: RewardType;
    value: number;
    currency?: string;
    description?: string;
  };

  @Column({ type: 'int', nullable: true })
  maxRedemptions: number;

  @Column({ type: 'int', default: 0 })
  currentRedemptions: number;

  @Column({ type: 'int', nullable: true })
  maxRedemptionsPerUser: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPurchaseAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  endDate: Date;

  @Column({ type: 'json', nullable: true })
  eligibilityRules: {
    newUsersOnly?: boolean;
    excludeExistingCustomers?: boolean;
    requiredUserTags?: string[];
    excludedUserTags?: string[];
    geographicRestrictions?: string[];
    deviceRestrictions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  trackingSettings: {
    cookieLifetime?: number; // days
    attributionWindow?: number; // days
    trackingMethods?: string[];
    conversionEvents?: string[];
    customParameters?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  socialSharing: {
    enableSocialSharing?: boolean;
    platforms?: string[];
    shareMessage?: string;
    shareImageUrl?: string;
    customHashtags?: string[];
    incentivizeSharing?: boolean;
    sharingReward?: {
      type: RewardType;
      value: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  fraudPrevention: {
    enableFraudDetection?: boolean;
    maxReferralsPerDay?: number;
    requireEmailVerification?: boolean;
    requirePhoneVerification?: boolean;
    blockSelfReferrals?: boolean;
    ipRestrictions?: boolean;
    deviceFingerprinting?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  analytics: {
    totalReferrals?: number;
    successfulReferrals?: number;
    conversionRate?: number;
    totalRevenueGenerated?: number;
    averageOrderValue?: number;
    customerLifetimeValue?: number;
    costPerAcquisition?: number;
    returnOnInvestment?: number;
  };

  @Column({ type: 'json', nullable: true })
  customization: {
    brandColors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    logoUrl?: string;
    customCss?: string;
    emailTemplates?: {
      referrerInvite?: string;
      refereeWelcome?: string;
      rewardNotification?: string;
    };
    landingPageUrl?: string;
    termsAndConditions?: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ReferralCode, (code) => code.program)
  codes: ReferralCode[];

  @OneToMany(() => ReferralTracking, (tracking) => tracking.program)
  trackings: ReferralTracking[];

  // Virtual fields
  get isExpired(): boolean {
    return this.endDate ? new Date() > this.endDate : false;
  }

  get isStarted(): boolean {
    return this.startDate ? new Date() >= this.startDate : true;
  }

  get remainingRedemptions(): number {
    return this.maxRedemptions ? this.maxRedemptions - this.currentRedemptions : Infinity;
  }

  get conversionRate(): number {
    const analytics = this.analytics || {};
    const totalReferrals = analytics.totalReferrals || 0;
    const successfulReferrals = analytics.successfulReferrals || 0;
    return totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;
  }
}
