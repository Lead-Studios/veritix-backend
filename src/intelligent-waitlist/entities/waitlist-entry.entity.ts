import { User } from 'src/user/entities/user.entity';
import { Event } from 'src/event/entities/event.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { WaitlistNotificationPreference } from './waitlist-notification-preference.entity';
import { WaitlistTicketRelease } from './waitlist-ticket-release.entity';

export enum WaitlistPriority {
  STANDARD = 'standard',
  VIP = 'vip',
  PREMIUM = 'premium',
  LOYALTY = 'loyalty',
}

export enum WaitlistStatus {
  ACTIVE = 'active',
  NOTIFIED = 'notified',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
  REMOVED = 'removed',
}

@Entity('intelligent_waitlist_entries')
@Index(['eventId', 'createdAt'])
@Index(['eventId', 'priority', 'createdAt'])
@Index(['userId', 'eventId'], { unique: true })
@Index(['status', 'priority'])
export class IntelligentWaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @Column({
    type: 'enum',
    enum: WaitlistPriority,
    default: WaitlistPriority.STANDARD,
  })
  priority: WaitlistPriority;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.ACTIVE,
  })
  status: WaitlistStatus;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'int', default: 1 })
  ticketQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPriceWilling: number;

  @Column({ type: 'json', nullable: true })
  seatPreferences: {
    sections?: string[];
    accessibility?: boolean;
    adjacentSeats?: boolean;
    maxRowSpread?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  notificationExpiresAt: Date;

  @Column({ type: 'int', default: 0 })
  notificationCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: {
    source?: string;
    referralCode?: string;
    loyaltyTier?: string;
    previousPurchases?: number;
    engagementScore?: number;
    deviceInfo?: any;
    locationInfo?: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  convertedOrderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @OneToMany(() => WaitlistNotificationPreference, preference => preference.waitlistEntry)
  notificationPreferences: WaitlistNotificationPreference[];

  @OneToMany(() => WaitlistTicketRelease, release => release.waitlistEntry)
  ticketReleases: WaitlistTicketRelease[];

  // Virtual properties for analytics
  get waitingDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isExpired(): boolean {
    return this.notificationExpiresAt && new Date() > this.notificationExpiresAt;
  }

  get estimatedWaitTime(): number {
    // This would be calculated based on historical data and current position
    // For now, return a simple calculation
    return this.position * 24; // hours
  }
}
