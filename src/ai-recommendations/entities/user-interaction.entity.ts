import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

export enum InteractionType {
  VIEW = 'view',
  CLICK = 'click',
  PURCHASE = 'purchase',
  SHARE = 'share',
  FAVORITE = 'favorite',
  SEARCH = 'search',
  FILTER = 'filter',
  CART_ADD = 'cart_add',
  CART_REMOVE = 'cart_remove',
  WISHLIST_ADD = 'wishlist_add',
  REVIEW = 'review',
  RATING = 'rating',
}

export enum InteractionContext {
  HOMEPAGE = 'homepage',
  SEARCH_RESULTS = 'search_results',
  CATEGORY_PAGE = 'category_page',
  EVENT_DETAIL = 'event_detail',
  RECOMMENDATION = 'recommendation',
  EMAIL = 'email',
  SOCIAL_MEDIA = 'social_media',
  MOBILE_APP = 'mobile_app',
}

@Entity()
@Index(['userId', 'interactionType'])
@Index(['eventId', 'interactionType'])
@Index(['createdAt'])
@Index(['sessionId'])
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ nullable: true })
  eventId: string;

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @Column({
    type: 'enum',
    enum: InteractionType,
  })
  interactionType: InteractionType;

  @Column({
    type: 'enum',
    enum: InteractionContext,
    nullable: true,
  })
  context: InteractionContext;

  @Column({ type: 'float', default: 1.0 })
  weight: number;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  deviceType: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ type: 'json', nullable: true })
  searchQuery: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  filterCriteria: Record<string, any>;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
