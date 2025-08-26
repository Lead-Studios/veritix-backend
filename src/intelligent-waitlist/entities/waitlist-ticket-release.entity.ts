import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IntelligentWaitlistEntry } from './waitlist-entry.entity';
import { Event } from 'src/event/entities/event.entity';

export enum ReleaseReason {
  CANCELLATION = 'cancellation',
  REFUND = 'refund',
  ADDITIONAL_INVENTORY = 'additional_inventory',
  PRICE_CHANGE = 'price_change',
  MANUAL_RELEASE = 'manual_release',
  SYSTEM_RELEASE = 'system_release',
}

export enum ReleaseStatus {
  PENDING = 'pending',
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('waitlist_ticket_releases')
@Index(['eventId', 'createdAt'])
@Index(['waitlistEntryId', 'status'])
@Index(['status', 'expiresAt'])
export class WaitlistTicketRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  waitlistEntryId: string;

  @Column('uuid')
  eventId: string;

  @Column({ type: 'int' })
  ticketQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  offerPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number;

  @Column({
    type: 'enum',
    enum: ReleaseReason,
  })
  releaseReason: ReleaseReason;

  @Column({
    type: 'enum',
    enum: ReleaseStatus,
    default: ReleaseStatus.PENDING,
  })
  status: ReleaseStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'int', default: 24 })
  offerDurationHours: number;

  @Column({ type: 'json', nullable: true })
  ticketDetails: {
    seatIds?: string[];
    sectionNames?: string[];
    rowNumbers?: string[];
    seatNumbers?: string[];
    ticketTypes?: string[];
    restrictions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  notificationDetails: {
    sentAt?: Date;
    channels?: string[];
    messageId?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'bounced';
    openedAt?: Date;
    clickedAt?: Date;
  };

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  declinedAt: Date;

  @Column({ type: 'text', nullable: true })
  declineReason: string;

  @Column({ type: 'uuid', nullable: true })
  resultingOrderId: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    automatedRelease?: boolean;
    batchId?: string;
    priority?: number;
    sourceTicketIds?: string[];
    releaseTriggerId?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => IntelligentWaitlistEntry, entry => entry.ticketReleases, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'waitlistEntryId' })
  waitlistEntry: IntelligentWaitlistEntry;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // Virtual properties
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get timeRemaining(): number {
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60))); // hours
  }

  get isActive(): boolean {
    return this.status === ReleaseStatus.OFFERED && !this.isExpired;
  }
}
