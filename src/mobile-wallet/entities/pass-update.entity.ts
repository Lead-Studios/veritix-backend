import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { WalletPass } from './wallet-pass.entity';

export enum UpdateType {
  FIELD_UPDATE = 'field_update',
  STATUS_CHANGE = 'status_change',
  LOCATION_UPDATE = 'location_update',
  BEACON_UPDATE = 'beacon_update',
  APPEARANCE_UPDATE = 'appearance_update',
  EXPIRY_UPDATE = 'expiry_update',
  QR_CODE_UPDATE = 'qr_code_update',
  NOTIFICATION_UPDATE = 'notification_update',
  BULK_UPDATE = 'bulk_update',
}

export enum UpdateStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('pass_updates')
@Index(['walletPassId', 'updateType'])
@Index(['status', 'scheduledFor'])
@Index(['createdAt'])
export class PassUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  walletPassId: string;

  @Column({
    type: 'enum',
    enum: UpdateType,
  })
  updateType: UpdateType;

  @Column({
    type: 'enum',
    enum: UpdateStatus,
    default: UpdateStatus.PENDING,
  })
  status: UpdateStatus;

  @Column('text', { nullable: true })
  description: string;

  @Column('simple-json')
  updateData: {
    // Field updates
    fieldChanges?: Array<{
      fieldKey: string;
      oldValue: string;
      newValue: string;
      fieldType: 'header' | 'primary' | 'secondary' | 'auxiliary' | 'back';
    }>;
    
    // Status changes
    statusChange?: {
      oldStatus: string;
      newStatus: string;
      reason?: string;
    };
    
    // Location updates
    locationChanges?: {
      added?: Array<{
        latitude: number;
        longitude: number;
        altitude?: number;
        relevantText?: string;
      }>;
      removed?: Array<{
        latitude: number;
        longitude: number;
      }>;
      modified?: Array<{
        latitude: number;
        longitude: number;
        altitude?: number;
        relevantText?: string;
      }>;
    };
    
    // Beacon updates
    beaconChanges?: {
      added?: Array<{
        proximityUUID: string;
        major?: number;
        minor?: number;
        relevantText?: string;
      }>;
      removed?: Array<{
        proximityUUID: string;
        major?: number;
        minor?: number;
      }>;
      modified?: Array<{
        proximityUUID: string;
        major?: number;
        minor?: number;
        relevantText?: string;
      }>;
    };
    
    // Appearance updates
    appearanceChanges?: {
      backgroundColor?: string;
      foregroundColor?: string;
      labelColor?: string;
      logoText?: string;
      images?: {
        stripImage?: string;
        thumbnailImage?: string;
        backgroundImage?: string;
        footerImage?: string;
        iconImage?: string;
      };
    };
    
    // Expiry updates
    expiryChanges?: {
      oldExpiryDate?: Date;
      newExpiryDate?: Date;
      reason?: string;
    };
    
    // QR code updates
    qrCodeChanges?: {
      oldQrData?: string;
      newQrData?: string;
      oldBarcodeMessage?: string;
      newBarcodeMessage?: string;
    };
    
    // Notification updates
    notificationChanges?: {
      relevantDate?: Date;
      notificationText?: string;
      notificationType?: string;
    };
  };

  @Column('timestamp', { nullable: true })
  scheduledFor: Date;

  @Column('timestamp', { nullable: true })
  processedAt: Date;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('simple-json', { nullable: true })
  processingResult: {
    success: boolean;
    updatedFields?: string[];
    failedFields?: string[];
    notificationsSent?: number;
    devicesUpdated?: number;
    errors?: string[];
  };

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column('simple-json', { nullable: true })
  metadata: {
    triggeredBy?: string; // user_id or 'system'
    triggerReason?: string;
    batchId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notifyUser?: boolean;
    updateSource?: 'manual' | 'automatic' | 'event_change' | 'bulk_operation';
  };

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => WalletPass, (pass) => pass.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletPassId' })
  walletPass: WalletPass;

  // Virtual properties
  get isPending(): boolean {
    return this.status === UpdateStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === UpdateStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === UpdateStatus.COMPLETED;
  }

  get hasFailed(): boolean {
    return this.status === UpdateStatus.FAILED;
  }

  get canRetry(): boolean {
    return this.hasFailed && this.retryCount < this.maxRetries;
  }

  get isScheduled(): boolean {
    return this.scheduledFor && this.scheduledFor > new Date();
  }

  get isOverdue(): boolean {
    return this.scheduledFor && this.scheduledFor < new Date() && this.isPending;
  }

  get processingDuration(): number | null {
    if (!this.processedAt) return null;
    return this.processedAt.getTime() - this.createdAt.getTime();
  }

  get priority(): 'low' | 'normal' | 'high' | 'urgent' {
    return this.metadata?.priority || 'normal';
  }

  get isHighPriority(): boolean {
    return ['high', 'urgent'].includes(this.priority);
  }
}
