import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EnhancedSeat } from './enhanced-seat.entity';
import { VenueMap } from './venue-map.entity';

export enum ReservationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ReservationType {
  TEMPORARY = 'temporary', // During seat selection process
  CHECKOUT = 'checkout', // During payment process
  HOLD = 'hold', // Administrative hold
  GROUP = 'group', // Part of group booking
}

@Entity('seat_reservations')
@Index(['seatId', 'status'])
@Index(['sessionId', 'status'])
@Index(['expiresAt'])
@Index(['venueMapId', 'status'])
export class SeatReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  seatId: string;

  @ManyToOne(() => EnhancedSeat, (seat) => seat.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat: EnhancedSeat;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({ type: 'varchar', length: 255 })
  sessionId: string; // Browser session or user session ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string; // User ID if logged in

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Column({
    type: 'enum',
    enum: ReservationType,
    default: ReservationType.TEMPORARY,
  })
  type: ReservationType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reservedPrice: number; // Price locked at time of reservation

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    selectionTime?: Date;
    groupBookingId?: string;
    cartId?: string;
    checkoutSessionId?: string;
  };

  @Column({ type: 'int', default: 0 })
  extensionCount: number; // How many times reservation was extended

  @Column({ type: 'timestamp', nullable: true })
  lastExtendedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  completionReference: string; // Order ID or ticket ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isActive(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired;
  }

  get remainingTime(): number {
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }

  get remainingTimeMinutes(): number {
    return Math.floor(this.remainingTime / (1000 * 60));
  }

  get canExtend(): boolean {
    return this.isActive && this.extensionCount < 3; // Max 3 extensions
  }
}
