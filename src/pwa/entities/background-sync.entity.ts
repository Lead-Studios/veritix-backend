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

export enum SyncAction {
  TICKET_PURCHASE = 'ticket_purchase',
  PROFILE_UPDATE = 'profile_update',
  EVENT_FAVORITE = 'event_favorite',
  EVENT_UNFAVORITE = 'event_unfavorite',
  REVIEW_SUBMIT = 'review_submit',
  RATING_SUBMIT = 'rating_submit',
  WAITLIST_JOIN = 'waitlist_join',
  NOTIFICATION_PREFERENCE = 'notification_preference',
  SEARCH_HISTORY = 'search_history',
  INTERACTION_TRACKING = 'interaction_tracking',
}

export enum SyncStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum SyncPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

@Entity('background_sync_jobs')
@Index(['userId', 'status'])
@Index(['action', 'status'])
@Index(['priority', 'createdAt'])
@Index(['status', 'nextRetryAt'])
export class BackgroundSyncJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SyncAction,
  })
  action: SyncAction;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.QUEUED,
  })
  status: SyncStatus;

  @Column({
    type: 'enum',
    enum: SyncPriority,
    default: SyncPriority.NORMAL,
  })
  priority: SyncPriority;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    deviceId?: string;
    sessionId?: string;
    userAgent?: string;
    networkType?: string;
    batteryLevel?: number;
    isOnline?: boolean;
    timestamp?: string;
    correlationId?: string;
  };

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'integer', default: 3 })
  maxRetries: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'integer', nullable: true })
  processingDuration: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  get canRetry(): boolean {
    return this.status === SyncStatus.FAILED && 
           this.retryCount < this.maxRetries && 
           !this.isExpired &&
           this.isActive;
  }

  get isReadyForRetry(): boolean {
    return this.canRetry && 
           (!this.nextRetryAt || this.nextRetryAt <= new Date());
  }

  get totalProcessingTime(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  get waitTime(): number | null {
    if (this.createdAt && this.startedAt) {
      return this.startedAt.getTime() - this.createdAt.getTime();
    }
    return null;
  }
}
