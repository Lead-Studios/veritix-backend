import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  STORY = 'story',
  REVIEW = 'review',
  TESTIMONIAL = 'testimonial',
}

export enum ContentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FEATURED = 'featured',
  ARCHIVED = 'archived',
}

export enum ModerationFlag {
  INAPPROPRIATE = 'inappropriate',
  SPAM = 'spam',
  COPYRIGHT = 'copyright',
  FAKE = 'fake',
  OFFENSIVE = 'offensive',
  LOW_QUALITY = 'low_quality',
}

@Entity('user_generated_content')
@Index(['eventId', 'status'])
@Index(['userId', 'contentType'])
@Index(['campaignId', 'status'])
@Index(['platform', 'createdAt'])
export class UserGeneratedContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  campaignId: string;

  @Column({ type: 'uuid', nullable: true })
  organizerId: string;

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  @Index()
  contentType: ContentType;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.PENDING,
  })
  @Index()
  status: ContentStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  mediaUrls: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  }>;

  @Column({ type: 'varchar', length: 255 })
  authorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorUsername: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorEmail: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  authorAvatarUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  platform: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  originalUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  platformPostId: string;

  @Column({ type: 'json', nullable: true })
  hashtags: string[];

  @Column({ type: 'json', nullable: true })
  mentions: Array<{
    username: string;
    userId?: string;
    displayName?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    views?: number;
    reach?: number;
    impressions?: number;
    lastUpdated?: Date;
  };

  @Column({ type: 'json', nullable: true })
  location: {
    name?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };

  @Column({ type: 'json', nullable: true })
  permissions: {
    canRepost?: boolean;
    canFeature?: boolean;
    canModify?: boolean;
    canCommercialUse?: boolean;
    attribution?: string;
    expiresAt?: Date;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  sentimentScore: number;

  @Column({ type: 'json', nullable: true })
  aiAnalysis: {
    objectDetection?: string[];
    sceneAnalysis?: string[];
    textAnalysis?: {
      keywords?: string[];
      sentiment?: string;
      topics?: string[];
      language?: string;
    };
    brandMentions?: string[];
    logoDetection?: boolean;
    inappropriateContent?: boolean;
    confidenceScore?: number;
  };

  @Column({ type: 'json', nullable: true })
  moderation: {
    flags?: ModerationFlag[];
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    autoModerated?: boolean;
    humanReviewRequired?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  rewards: {
    points?: number;
    badges?: string[];
    prizes?: Array<{
      type: string;
      value: number;
      description: string;
      claimedAt?: Date;
    }>;
    featured?: {
      startDate: Date;
      endDate: Date;
      platforms: string[];
    };
  };

  @Column({ type: 'int', default: 0 })
  repostCount: number;

  @Column({ type: 'int', default: 0 })
  featureCount: number;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @Column({ type: 'timestamp', nullable: true })
  featuredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastModerationAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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

  get isFeatured(): boolean {
    return this.status === ContentStatus.FEATURED;
  }

  get needsReview(): boolean {
    return this.status === ContentStatus.PENDING || 
           (this.moderation?.humanReviewRequired === true);
  }
}
