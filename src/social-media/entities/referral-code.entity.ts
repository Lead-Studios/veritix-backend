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
import { ReferralProgram } from './referral-program.entity';
import { ReferralTracking } from './referral-tracking.entity';

export enum CodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted',
  SUSPENDED = 'suspended',
}

@Entity('referral_codes')
@Index(['programId', 'status'])
@Index(['userId', 'status'])
@Index(['code'], { unique: true })
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  programId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  code: string;

  @Column({
    type: 'enum',
    enum: CodeStatus,
    default: CodeStatus.ACTIVE,
  })
  @Index()
  status: CodeStatus;

  @Column({ type: 'int', nullable: true })
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  currentUses: number;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  customData: {
    source?: string;
    campaign?: string;
    medium?: string;
    content?: string;
    term?: string;
    customParameters?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  restrictions: {
    firstTimeUsersOnly?: boolean;
    minimumPurchase?: number;
    maximumDiscount?: number;
    allowedProducts?: string[];
    excludedProducts?: string[];
    allowedCategories?: string[];
    excludedCategories?: string[];
  };

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenueGenerated: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRewardsEarned: number;

  @Column({ type: 'int', default: 0 })
  successfulReferrals: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastUsedIp: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastUsedUserAgent: string;

  @Column({ type: 'json', nullable: true })
  socialSharing: {
    shareCount?: number;
    platforms?: Record<string, number>;
    lastSharedAt?: Date;
    shareUrls?: Record<string, string>;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ReferralProgram, (program) => program.codes)
  @JoinColumn({ name: 'programId' })
  program: ReferralProgram;

  @OneToMany(() => ReferralTracking, (tracking) => tracking.referralCode)
  trackings: ReferralTracking[];

  // Virtual fields
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isExhausted(): boolean {
    return this.maxUses ? this.currentUses >= this.maxUses : false;
  }

  get remainingUses(): number {
    return this.maxUses ? Math.max(0, this.maxUses - this.currentUses) : Infinity;
  }

  get conversionRate(): number {
    return this.currentUses > 0 ? (this.successfulReferrals / this.currentUses) * 100 : 0;
  }

  get averageOrderValue(): number {
    return this.successfulReferrals > 0 ? this.totalRevenueGenerated / this.successfulReferrals : 0;
  }
}
