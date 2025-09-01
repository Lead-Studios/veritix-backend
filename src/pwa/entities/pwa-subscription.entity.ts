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

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

@Entity('pwa_subscriptions')
@Index(['userId', 'status'])
@Index(['endpoint'], { unique: true })
export class PWASubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text' })
  p256dhKey: string;

  @Column({ type: 'text' })
  authKey: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
  })
  deviceType: DeviceType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  browserName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browserVersion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osVersion: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    eventUpdates?: boolean;
    ticketReminders?: boolean;
    promotionalOffers?: boolean;
    systemNotifications?: boolean;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE && 
           (!this.expiresAt || this.expiresAt > new Date());
  }

  get deviceInfo(): string {
    const parts = [this.deviceName, this.browserName, this.osName].filter(Boolean);
    return parts.join(' - ') || 'Unknown Device';
  }
}
