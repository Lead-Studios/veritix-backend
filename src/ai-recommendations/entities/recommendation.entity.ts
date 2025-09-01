import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { RecommendationModel } from './recommendation-model.entity';

export enum RecommendationStatus {
  GENERATED = 'generated',
  VIEWED = 'viewed',
  CLICKED = 'clicked',
  PURCHASED = 'purchased',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

export enum RecommendationReason {
  SIMILAR_USERS = 'similar_users',
  PAST_BEHAVIOR = 'past_behavior',
  POPULAR = 'popular',
  TRENDING = 'trending',
  LOCATION_BASED = 'location_based',
  CATEGORY_PREFERENCE = 'category_preference',
  PRICE_PREFERENCE = 'price_preference',
  TIME_PREFERENCE = 'time_preference',
}

@Entity()
@Index(['userId', 'status'])
@Index(['eventId', 'score'])
@Index(['createdAt'])
@Index(['modelId'])
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  eventId: string;

  @ManyToOne(() => Event)
  event: Event;

  @Column()
  modelId: string;

  @ManyToOne(() => RecommendationModel)
  model: RecommendationModel;

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'float', default: 1.0 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.GENERATED,
  })
  status: RecommendationStatus;

  @Column({
    type: 'enum',
    enum: RecommendationReason,
    array: true,
  })
  reasons: RecommendationReason[];

  @Column({ type: 'json', nullable: true })
  explanation: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  features: Record<string, number>;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column({ nullable: true })
  campaignId: string;

  @Column({ nullable: true })
  abTestGroup: string;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  purchasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
