import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

export enum NotificationType {
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLED = 'event_cancelled',
  TICKET_PURCHASED = 'ticket_purchased',
  TICKET_TRANSFERRED = 'ticket_transferred',
  PROMOTIONAL_OFFER = 'promotional_offer',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  VENUE_CHANGE = 'venue_change',
  TIME_CHANGE = 'time_change',
  LAST_CHANCE = 'last_chance',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('push_notifications')
@Index(['userId', 'status'])
@Index(['eventId', 'type'])
@Index(['scheduledFor'])
@Index(['status', 'priority'])
export class PushNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'event_id', nullable: true })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  badge: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  image: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  clickAction: string;

  @Column({ type: 'jsonb', nullable: true })
  data: {
    eventId?: string;
    ticketId?: string;
    url?: string;
    action?: string;
    customData?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  actions: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  deliveryMetrics: {
    deliveryAttempts?: number;
    responseTime?: number;
    deviceResponse?: string;
    networkType?: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  get canRetry(): boolean {
    return this.status === NotificationStatus.FAILED && 
           this.retryCount < 3 && 
           !this.isExpired;
  }

  get isScheduled(): boolean {
    return this.scheduledFor && this.scheduledFor > new Date();
  }

  get deliveryTime(): number | null {
    if (this.sentAt && this.deliveredAt) {
      return this.deliveredAt.getTime() - this.sentAt.getTime();
    }
    return null;
  }
}
