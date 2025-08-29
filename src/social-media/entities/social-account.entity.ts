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
import { SocialPost } from './social-post.entity';
import { SocialCampaign } from './social-campaign.entity';

export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  ERROR = 'error',
}

@Entity('social_accounts')
@Index(['organizerId', 'platform'])
@Index(['platform', 'status'])
export class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({
    type: 'enum',
    enum: SocialPlatform,
  })
  @Index()
  platform: SocialPlatform;

  @Column({ type: 'varchar', length: 255 })
  platformUserId: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({ type: 'text' })
  accessToken: string; // Encrypted

  @Column({ type: 'text', nullable: true })
  refreshToken: string; // Encrypted

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  @Index()
  status: AccountStatus;

  @Column({ type: 'json', nullable: true })
  permissions: {
    canPost?: boolean;
    canReadInsights?: boolean;
    canManageAds?: boolean;
    canAccessPages?: boolean;
    scopes?: string[];
  };

  @Column({ type: 'json', nullable: true })
  platformData: {
    pageId?: string;
    businessAccountId?: string;
    adAccountId?: string;
    verificationStatus?: string;
    accountType?: string;
    category?: string;
    website?: string;
    location?: {
      city?: string;
      country?: string;
      timezone?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  settings: {
    autoPost?: boolean;
    defaultHashtags?: string[];
    postingSchedule?: {
      timezone?: string;
      preferredTimes?: string[];
      avoidDays?: string[];
    };
    contentFilters?: {
      requireApproval?: boolean;
      blockedWords?: string[];
      allowedContentTypes?: string[];
    };
  };

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPostAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError: string;

  @Column({ type: 'int', default: 0 })
  totalPosts: number;

  @Column({ type: 'int', default: 0 })
  totalEngagement: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => SocialPost, (post) => post.account)
  posts: SocialPost[];

  @OneToMany(() => SocialCampaign, (campaign) => campaign.account)
  campaigns: SocialCampaign[];

  // Virtual fields
  get engagementRate(): number {
    return this.followersCount > 0 ? (this.totalEngagement / this.followersCount) * 100 : 0;
  }

  get isTokenExpired(): boolean {
    return this.tokenExpiresAt ? new Date() > this.tokenExpiresAt : false;
  }
}
