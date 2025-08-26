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

export enum AnalyticsEventType {
  PASS_CREATED = 'pass_created',
  PASS_DOWNLOADED = 'pass_downloaded',
  PASS_INSTALLED = 'pass_installed',
  PASS_VIEWED = 'pass_viewed',
  PASS_UPDATED = 'pass_updated',
  PASS_SHARED = 'pass_shared',
  PASS_DELETED = 'pass_deleted',
  LOCATION_TRIGGERED = 'location_triggered',
  BEACON_TRIGGERED = 'beacon_triggered',
  QR_CODE_SCANNED = 'qr_code_scanned',
  PASS_EXPIRED = 'pass_expired',
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_OPENED = 'notification_opened',
}

@Entity('pass_analytics')
@Index(['walletPassId', 'eventType'])
@Index(['eventType', 'timestamp'])
@Index(['deviceId', 'timestamp'])
export class PassAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  walletPassId: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
  })
  eventType: AnalyticsEventType;

  @Column('timestamp')
  timestamp: Date;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  deviceType: string; // iOS, Android

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column('simple-json', { nullable: true })
  location: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    altitude?: number;
  };

  @Column('simple-json', { nullable: true })
  eventData: {
    // For sharing events
    sharedWith?: string;
    shareMethod?: string;
    
    // For location/beacon events
    triggeredLocation?: {
      latitude: number;
      longitude: number;
      relevantText?: string;
    };
    triggeredBeacon?: {
      proximityUUID: string;
      major?: number;
      minor?: number;
      proximity?: string;
    };
    
    // For QR code events
    scanLocation?: string;
    scanDevice?: string;
    
    // For notification events
    notificationType?: string;
    notificationContent?: string;
    
    // General metadata
    duration?: number;
    previousValue?: string;
    newValue?: string;
    errorMessage?: string;
  };

  @Column('simple-json', { nullable: true })
  sessionInfo: {
    sessionId?: string;
    sessionStart?: Date;
    sessionDuration?: number;
    pageViews?: number;
    interactions?: number;
  };

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => WalletPass, (pass) => pass.analytics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletPassId' })
  walletPass: WalletPass;

  // Virtual properties
  get isEngagementEvent(): boolean {
    return [
      AnalyticsEventType.PASS_VIEWED,
      AnalyticsEventType.QR_CODE_SCANNED,
      AnalyticsEventType.LOCATION_TRIGGERED,
      AnalyticsEventType.BEACON_TRIGGERED,
      AnalyticsEventType.NOTIFICATION_OPENED,
    ].includes(this.eventType);
  }

  get isInstallationEvent(): boolean {
    return [
      AnalyticsEventType.PASS_DOWNLOADED,
      AnalyticsEventType.PASS_INSTALLED,
    ].includes(this.eventType);
  }

  get isSharingEvent(): boolean {
    return this.eventType === AnalyticsEventType.PASS_SHARED;
  }

  get hasLocationData(): boolean {
    return !!(this.location?.latitude && this.location?.longitude);
  }
}
