import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VenueMap } from './venue-map.entity';
import { EnhancedSeat } from './enhanced-seat.entity';

export enum GroupBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum GroupBookingType {
  ADJACENT = 'adjacent',
  SAME_ROW = 'same_row',
  SAME_SECTION = 'same_section',
  FLEXIBLE = 'flexible',
  CUSTOM = 'custom',
}

@Entity('group_bookings')
@Index(['venueMapId', 'status'])
@Index(['sessionId', 'status'])
@Index(['expiresAt'])
export class GroupBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({ type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  groupName: string;

  @Column({
    type: 'enum',
    enum: GroupBookingStatus,
    default: GroupBookingStatus.PENDING,
  })
  status: GroupBookingStatus;

  @Column({
    type: 'enum',
    enum: GroupBookingType,
    default: GroupBookingType.ADJACENT,
  })
  bookingType: GroupBookingType;

  @Column({ type: 'int' })
  requestedSeats: number;

  @Column({ type: 'int', default: 0 })
  confirmedSeats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage: number;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    sectionPreferences?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
    accessibilityRequired?: boolean;
    wheelchairSeats?: number;
    companionSeats?: number;
    avoidSections?: string[];
    preferredRows?: string[];
    maxRowSpread?: number;
    allowSplit?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  constraints: {
    mustBeAdjacent: boolean;
    maxGapBetweenSeats: number;
    allowDifferentRows: boolean;
    allowDifferentSections: boolean;
    prioritizePrice: boolean;
    prioritizeLocation: boolean;
  };

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    specialRequests?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    bookingChannel?: string;
    promoCode?: string;
  };

  @OneToMany(() => EnhancedSeat, (seat) => seat.groupBooking)
  seats: EnhancedSeat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isActive(): boolean {
    return this.status === GroupBookingStatus.PENDING && !this.isExpired;
  }

  get fulfillmentRate(): number {
    return this.requestedSeats > 0 ? (this.confirmedSeats / this.requestedSeats) * 100 : 0;
  }

  get remainingSeats(): number {
    return Math.max(0, this.requestedSeats - this.confirmedSeats);
  }

  get isPartiallyFulfilled(): boolean {
    return this.confirmedSeats > 0 && this.confirmedSeats < this.requestedSeats;
  }

  get isFullyFulfilled(): boolean {
    return this.confirmedSeats >= this.requestedSeats;
  }

  get effectivePrice(): number {
    if (!this.totalPrice) return 0;
    return this.totalPrice - (this.discountAmount || 0);
  }
}
