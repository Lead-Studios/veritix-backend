import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProofType {
  FRIEND_ATTENDANCE = 'friend_attendance',
  SOCIAL_MENTION = 'social_mention',
  REVIEW = 'review',
  TESTIMONIAL = 'testimonial',
  MEDIA_COVERAGE = 'media_coverage',
  INFLUENCER_ENDORSEMENT = 'influencer_endorsement',
  USER_COUNT = 'user_count',
  RECENT_ACTIVITY = 'recent_activity',
}

export enum ProofStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('social_proof')
@Index(['eventId', 'proofType'])
@Index(['userId', 'proofType'])
@Index(['status', 'createdAt'])
export class SocialProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  organizerId: string;

  @Column({
    type: 'enum',
    enum: ProofType,
  })
  @Index()
  proofType: ProofType;

  @Column({
    type: 'enum',
    enum: ProofStatus,
    default: ProofStatus.PENDING,
  })
  @Index()
  status: ProofStatus;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorUsername: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  authorAvatarUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  platform: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl: string;

  @Column({ type: 'json', nullable: true })
  mediaUrls: string[];

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  sharesCount: number;

  @Column({ type: 'int', default: 0 })
  commentsCount: number;

  @Column({ type: 'json', nullable: true })
  metrics: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    clickThroughRate?: number;
    conversionRate?: number;
  };

  @Column({ type: 'json', nullable: true })
  friendsData: Array<{
    userId: string;
    name: string;
    avatarUrl?: string;
    mutualFriends?: number;
    attendanceStatus?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata: {
    location?: string;
    timestamp?: Date;
    deviceType?: string;
    verified?: boolean;
    influencerTier?: string;
    followerCount?: number;
    engagementRate?: number;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  credibilityScore: number;

  @Column({ type: 'int', default: 0 })
  displayCount: number;

  @Column({ type: 'int', default: 0 })
  clickCount: number;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastDisplayedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get clickThroughRate(): number {
    return this.displayCount > 0 ? (this.clickCount / this.displayCount) * 100 : 0;
  }

  get totalEngagement(): number {
    return this.likesCount + this.sharesCount + this.commentsCount;
  }
}
