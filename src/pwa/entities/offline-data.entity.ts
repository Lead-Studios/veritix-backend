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

export enum OfflineDataType {
  TICKET = 'ticket',
  EVENT = 'event',
  USER_PROFILE = 'user_profile',
  VENUE = 'venue',
  ORGANIZER = 'organizer',
  CATEGORY = 'category',
  SEARCH_RESULTS = 'search_results',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

@Entity('offline_data')
@Index(['userId', 'dataType'])
@Index(['entityId', 'dataType'])
@Index(['syncStatus'])
@Index(['lastSyncAttempt'])
export class OfflineData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({
    type: 'enum',
    enum: OfflineDataType,
  })
  dataType: OfflineDataType;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: number;
    checksum?: string;
    dependencies?: string[];
    cacheStrategy?: 'aggressive' | 'conservative' | 'minimal';
    priority?: number;
    expiresAt?: string;
    tags?: string[];
  };

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  syncStatus: SyncStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAttempt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncSuccess: Date;

  @Column({ type: 'integer', default: 0 })
  syncAttempts: number;

  @Column({ type: 'text', nullable: true })
  syncError: string;

  @Column({ type: 'jsonb', nullable: true })
  conflictData: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isStale: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

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

  get needsSync(): boolean {
    return this.syncStatus === SyncStatus.PENDING || 
           this.syncStatus === SyncStatus.FAILED ||
           this.isStale;
  }

  get canRetrySync(): boolean {
    return this.syncAttempts < 5 && 
           this.syncStatus !== SyncStatus.SYNCED;
  }

  get dataSize(): number {
    return JSON.stringify(this.data).length;
  }
}
