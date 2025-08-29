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
import { SocialAccount } from './social-account.entity';
import { SocialPost } from './social-post.entity';

export enum CampaignType {
  EVENT_PROMOTION = 'event_promotion',
  BRAND_AWARENESS = 'brand_awareness',
  ENGAGEMENT = 'engagement',
  LEAD_GENERATION = 'lead_generation',
  TRAFFIC = 'traffic',
  CONVERSIONS = 'conversions',
  INFLUENCER = 'influencer',
  UGC = 'ugc',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('social_campaigns')
@Index(['accountId', 'status'])
@Index(['eventId', 'status'])
@Index(['organizerId', 'campaignType'])
export class SocialCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  accountId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  campaignType: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  @Index()
  status: CampaignStatus;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  endDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ type: 'json', nullable: true })
  objectives: {
    primary?: string;
    secondary?: string[];
    kpis?: Array<{
      metric: string;
      target: number;
      current?: number;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  targeting: {
    demographics?: {
      ageMin?: number;
      ageMax?: number;
      genders?: string[];
      languages?: string[];
    };
    interests?: string[];
    behaviors?: string[];
    locations?: Array<{
      type: 'country' | 'region' | 'city';
      name: string;
      code?: string;
    }>;
    customAudiences?: string[];
    lookalikeSources?: string[];
    exclusions?: {
      audiences?: string[];
      interests?: string[];
      behaviors?: string[];
    };
  };

  @Column({ type: 'json', nullable: true })
  contentStrategy: {
    themes?: string[];
    toneOfVoice?: string;
    visualStyle?: string;
    postingFrequency?: string;
    optimalTimes?: string[];
    hashtags?: {
      branded?: string[];
      trending?: string[];
      niche?: string[];
    };
    contentMix?: {
      promotional?: number;
      educational?: number;
      entertaining?: number;
      userGenerated?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  analytics: {
    impressions?: number;
    reach?: number;
    engagement?: number;
    clicks?: number;
    conversions?: number;
    costPerClick?: number;
    costPerConversion?: number;
    returnOnAdSpend?: number;
    engagementRate?: number;
    clickThroughRate?: number;
    conversionRate?: number;
    lastUpdated?: Date;
  };

  @Column({ type: 'json', nullable: true })
  automation: {
    autoPost?: boolean;
    autoRespond?: boolean;
    autoOptimize?: boolean;
    rules?: Array<{
      condition: string;
      action: string;
      parameters?: Record<string, any>;
    }>;
    aiOptimization?: {
      enabled?: boolean;
      optimizeFor?: string;
      learningPhase?: boolean;
      confidence?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  collaboration: {
    teamMembers?: Array<{
      userId: string;
      role: string;
      permissions: string[];
    }>;
    approvalWorkflow?: {
      required?: boolean;
      approvers?: string[];
      stages?: Array<{
        name: string;
        approvers: string[];
        required: boolean;
      }>;
    };
    externalCollaborators?: Array<{
      email: string;
      role: string;
      accessLevel: string;
    }>;
  };

  @Column({ type: 'int', default: 0 })
  totalPosts: number;

  @Column({ type: 'int', default: 0 })
  publishedPosts: number;

  @Column({ type: 'int', default: 0 })
  scheduledPosts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPostAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SocialAccount, (account) => account.campaigns)
  @JoinColumn({ name: 'accountId' })
  account: SocialAccount;

  @OneToMany(() => SocialPost, (post) => post.campaign)
  posts: SocialPost[];

  // Virtual fields
  get isActive(): boolean {
    const now = new Date();
    return this.status === CampaignStatus.ACTIVE &&
           (!this.startDate || now >= this.startDate) &&
           (!this.endDate || now <= this.endDate);
  }

  get budgetUtilization(): number {
    return this.budget ? (this.spentAmount / this.budget) * 100 : 0;
  }

  get remainingBudget(): number {
    return this.budget ? Math.max(0, this.budget - this.spentAmount) : 0;
  }

  get engagementRate(): number {
    const analytics = this.analytics || {};
    const reach = analytics.reach || 0;
    const engagement = analytics.engagement || 0;
    return reach > 0 ? (engagement / reach) * 100 : 0;
  }

  get roi(): number {
    const analytics = this.analytics || {};
    return analytics.returnOnAdSpend || 0;
  }
}
