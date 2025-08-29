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
import { SocialCampaign } from './social-campaign.entity';

export enum PostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  CAROUSEL = 'carousel',
  STORY = 'story',
  REEL = 'reel',
  LIVE = 'live',
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  DELETED = 'deleted',
}

@Entity('social_posts')
@Index(['accountId', 'status'])
@Index(['campaignId', 'publishedAt'])
@Index(['eventId', 'status'])
export class SocialPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  accountId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  campaignId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.TEXT,
  })
  postType: PostType;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  @Index()
  status: PostStatus;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  }>;

  @Column({ type: 'json', nullable: true })
  hashtags: string[];

  @Column({ type: 'json', nullable: true })
  mentions: Array<{
    username: string;
    userId?: string;
    displayName?: string;
  }>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string;

  @Column({ type: 'json', nullable: true })
  linkPreview: {
    title?: string;
    description?: string;
    imageUrl?: string;
    domain?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  publishedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  platformPostId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  platformUrl: string;

  @Column({ type: 'json', nullable: true })
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    impressions?: number;
    reach?: number;
    videoViews?: number;
    engagementRate?: number;
    lastUpdated?: Date;
  };

  @Column({ type: 'json', nullable: true })
  targeting: {
    locations?: string[];
    interests?: string[];
    demographics?: {
      ageMin?: number;
      ageMax?: number;
      genders?: string[];
    };
    customAudiences?: string[];
  };

  @Column({ type: 'json', nullable: true })
  settings: {
    allowComments?: boolean;
    allowSharing?: boolean;
    crossPostToPlatforms?: string[];
    boostPost?: boolean;
    boostBudget?: number;
    boostDuration?: number;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  @Column({ type: 'json', nullable: true })
  analytics: {
    clickThroughRate?: number;
    costPerClick?: number;
    costPerEngagement?: number;
    conversionRate?: number;
    revenue?: number;
    roi?: number;
  };

  @Column({ type: 'json', nullable: true })
  aiGenerated: {
    isAiGenerated?: boolean;
    prompt?: string;
    model?: string;
    confidence?: number;
    alternatives?: string[];
  };

  @Column({ type: 'boolean', default: false })
  isPromoted: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SocialAccount, (account) => account.posts)
  @JoinColumn({ name: 'accountId' })
  account: SocialAccount;

  @ManyToOne(() => SocialCampaign, (campaign) => campaign.posts)
  @JoinColumn({ name: 'campaignId' })
  campaign: SocialCampaign;

  // Virtual fields
  get totalEngagement(): number {
    const engagement = this.engagement || {};
    return (engagement.likes || 0) + 
           (engagement.comments || 0) + 
           (engagement.shares || 0) + 
           (engagement.saves || 0);
  }

  get engagementRate(): number {
    const engagement = this.engagement || {};
    const reach = engagement.reach || engagement.impressions || 0;
    return reach > 0 ? (this.totalEngagement / reach) * 100 : 0;
  }

  get isScheduled(): boolean {
    return this.status === PostStatus.SCHEDULED && this.scheduledAt > new Date();
  }

  get isPastDue(): boolean {
    return this.status === PostStatus.SCHEDULED && this.scheduledAt <= new Date();
  }
}
