import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InfluencerTier {
  NANO = 'nano',          // 1K-10K followers
  MICRO = 'micro',        // 10K-100K followers
  MACRO = 'macro',        // 100K-1M followers
  MEGA = 'mega',          // 1M+ followers
  CELEBRITY = 'celebrity', // 10M+ followers
}

export enum CollaborationStatus {
  DRAFT = 'draft',
  INVITED = 'invited',
  NEGOTIATING = 'negotiating',
  ACCEPTED = 'accepted',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum CollaborationType {
  SPONSORED_POST = 'sponsored_post',
  STORY_MENTION = 'story_mention',
  EVENT_ATTENDANCE = 'event_attendance',
  PRODUCT_REVIEW = 'product_review',
  BRAND_AMBASSADOR = 'brand_ambassador',
  GIVEAWAY = 'giveaway',
  TAKEOVER = 'takeover',
  LONG_TERM_PARTNERSHIP = 'long_term_partnership',
}

export enum CompensationType {
  MONETARY = 'monetary',
  FREE_TICKETS = 'free_tickets',
  MERCHANDISE = 'merchandise',
  EXPERIENCE = 'experience',
  COMMISSION = 'commission',
  BARTER = 'barter',
  NONE = 'none',
}

@Entity('influencer_collaborations')
@Index(['eventId', 'status'])
@Index(['influencerId', 'status'])
@Index(['organizerId', 'collaborationType'])
@Index(['tier', 'status'])
export class InfluencerCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid' })
  @Index()
  influencerId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CollaborationType,
  })
  @Index()
  collaborationType: CollaborationType;

  @Column({
    type: 'enum',
    enum: CollaborationStatus,
    default: CollaborationStatus.DRAFT,
  })
  @Index()
  status: CollaborationStatus;

  @Column({
    type: 'enum',
    enum: InfluencerTier,
  })
  @Index()
  tier: InfluencerTier;

  @Column({ type: 'json' })
  influencerProfile: {
    name: string;
    username: string;
    email?: string;
    platforms: Array<{
      platform: string;
      handle: string;
      followers: number;
      engagementRate: number;
      verificationStatus: boolean;
    }>;
    demographics: {
      primaryAudience: {
        ageRange: string;
        gender: string;
        locations: string[];
        interests: string[];
      };
      engagementMetrics: {
        averageLikes: number;
        averageComments: number;
        averageShares: number;
        bestPostingTimes: string[];
      };
    };
    contentStyle: {
      categories: string[];
      aesthetics: string[];
      contentTypes: string[];
    };
    rates: {
      postRate?: number;
      storyRate?: number;
      videoRate?: number;
      packageDeals?: Array<{
        description: string;
        price: number;
      }>;
    };
  };

  @Column({ type: 'json' })
  deliverables: Array<{
    type: string;
    platform: string;
    quantity: number;
    description: string;
    deadline: Date;
    requirements: {
      hashtags?: string[];
      mentions?: string[];
      links?: string[];
      contentGuidelines?: string;
      approvalRequired?: boolean;
    };
    status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'completed';
    submittedAt?: Date;
    approvedAt?: Date;
    postUrl?: string;
  }>;

  @Column({ type: 'json' })
  compensation: {
    type: CompensationType;
    amount?: number;
    currency?: string;
    details: string;
    paymentTerms: {
      method: string;
      schedule: string;
      milestones?: Array<{
        description: string;
        percentage: number;
        dueDate: Date;
        completed: boolean;
      }>;
    };
    additionalBenefits?: string[];
  };

  @Column({ type: 'json', nullable: true })
  contract: {
    terms: string;
    exclusivityPeriod?: number;
    usageRights: {
      duration: string;
      platforms: string[];
      modifications: boolean;
      commercialUse: boolean;
    };
    contentOwnership: string;
    cancellationPolicy: string;
    signedAt?: Date;
    signedByInfluencer?: boolean;
    signedByOrganizer?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  performance: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    clicks?: number;
    conversions?: number;
    mentions?: number;
    hashtags?: Record<string, number>;
    sentiment?: {
      positive: number;
      negative: number;
      neutral: number;
    };
    roi?: number;
    costPerEngagement?: number;
    brandLift?: number;
  };

  @Column({ type: 'json', nullable: true })
  communication: Array<{
    timestamp: Date;
    sender: 'organizer' | 'influencer';
    message: string;
    type: 'message' | 'proposal' | 'revision' | 'approval';
    attachments?: string[];
  }>;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  invitedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  satisfactionRating: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get totalFollowers(): number {
    return this.influencerProfile.platforms.reduce((total, platform) => 
      total + platform.followers, 0);
  }

  get averageEngagementRate(): number {
    const platforms = this.influencerProfile.platforms;
    if (platforms.length === 0) return 0;
    
    const totalEngagement = platforms.reduce((total, platform) => 
      total + platform.engagementRate, 0);
    return totalEngagement / platforms.length;
  }

  get completedDeliverables(): number {
    return this.deliverables.filter(d => d.status === 'completed').length;
  }

  get pendingDeliverables(): number {
    return this.deliverables.filter(d => 
      ['pending', 'in_progress', 'submitted'].includes(d.status)
    ).length;
  }

  get isOverdue(): boolean {
    return this.endDate ? new Date() > this.endDate && 
           this.status !== CollaborationStatus.COMPLETED : false;
  }

  get roi(): number {
    const performance = this.performance || {};
    const compensation = this.compensation.amount || 0;
    const conversions = performance.conversions || 0;
    
    // Assuming average conversion value - this would be configurable
    const avgConversionValue = 50;
    const revenue = conversions * avgConversionValue;
    
    return compensation > 0 ? ((revenue - compensation) / compensation) * 100 : 0;
  }
}
