import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VenueMap } from './venue-map.entity';
import { SeatPricingTier } from './seat-pricing-tier.entity';
import { SeatReservation } from './seat-reservation.entity';
import { GroupBooking } from './group-booking.entity';

export enum EnhancedSeatStatus {
  AVAILABLE = 'available',
  SELECTED = 'selected',
  RESERVED = 'reserved',
  SOLD = 'sold',
  HELD = 'held',
  BLOCKED = 'blocked',
  MAINTENANCE = 'maintenance',
}

export enum EnhancedSeatType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VIP = 'vip',
  WHEELCHAIR = 'wheelchair',
  COMPANION = 'companion',
  AISLE = 'aisle',
  BALCONY = 'balcony',
  BOX = 'box',
  STANDING = 'standing',
}

export enum AccessibilityType {
  NONE = 'none',
  WHEELCHAIR = 'wheelchair',
  COMPANION = 'companion',
  HEARING_IMPAIRED = 'hearing_impaired',
  VISUALLY_IMPAIRED = 'visually_impaired',
  MOBILITY_ASSISTANCE = 'mobility_assistance',
}

@Entity('enhanced_seats')
@Index(['venueMapId', 'status'])
@Index(['venueMapId', 'sectionId', 'row', 'number'])
@Index(['status', 'heldUntil'])
export class EnhancedSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, (venueMap) => venueMap.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({ type: 'varchar', length: 50 })
  sectionId: string;

  @Column({ type: 'varchar', length: 50 })
  sectionName: string;

  @Column({ type: 'varchar', length: 10 })
  row: string;

  @Column({ type: 'varchar', length: 10 })
  number: string;

  @Column({ type: 'varchar', length: 50 })
  label: string; // Display label like "Section A, Row 1, Seat 15"

  @Column({
    type: 'enum',
    enum: EnhancedSeatStatus,
    default: EnhancedSeatStatus.AVAILABLE,
  })
  status: EnhancedSeatStatus;

  @Column({
    type: 'enum',
    enum: EnhancedSeatType,
    default: EnhancedSeatType.STANDARD,
  })
  type: EnhancedSeatType;

  @Column({
    type: 'enum',
    enum: AccessibilityType,
    default: AccessibilityType.NONE,
  })
  accessibilityType: AccessibilityType;

  @Column('uuid', { nullable: true })
  pricingTierId: string;

  @ManyToOne(() => SeatPricingTier, { nullable: true })
  @JoinColumn({ name: 'pricingTierId' })
  pricingTier: SeatPricingTier;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number; // Can be dynamically adjusted

  @Column({ type: 'jsonb' })
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  svgAttributes: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    className?: string;
    transform?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  adjacentSeats: {
    left?: string; // Seat ID
    right?: string; // Seat ID
    front?: string; // Seat ID
    back?: string; // Seat ID
  };

  @Column({ type: 'jsonb', nullable: true })
  features: {
    hasArmrests: boolean;
    hasCupHolder: boolean;
    hasStorage: boolean;
    isReclining: boolean;
    hasTable: boolean;
    powerOutlet: boolean;
    wifiAccess: boolean;
    extraLegroom: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
    minAge?: number;
    maxAge?: number;
    requiresAdult: boolean;
    vipOnly: boolean;
    memberOnly: boolean;
    genderRestriction?: 'male' | 'female' | 'none';
  };

  @Column({ type: 'timestamp', nullable: true })
  heldUntil: Date; // For temporary holds during selection

  @Column({ type: 'varchar', length: 255, nullable: true })
  holdReference: string; // Session ID or user ID holding the seat

  @Column({ type: 'timestamp', nullable: true })
  lastSelectedAt: Date;

  @Column({ type: 'int', default: 0 })
  selectionCount: number; // Track how many times this seat has been selected

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  popularityScore: number; // 0.0 to 1.0 based on selection frequency

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isSelectable: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string; // Special notes about the seat

  @OneToMany(() => SeatReservation, (reservation) => reservation.seat)
  reservations: SeatReservation[];

  @ManyToOne(() => GroupBooking, (groupBooking) => groupBooking.seats, { nullable: true })
  groupBooking: GroupBooking;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get fullIdentifier(): string {
    return `${this.sectionName}-${this.row}-${this.number}`;
  }

  get displayLabel(): string {
    return this.label || `${this.sectionName} ${this.row}-${this.number}`;
  }

  get isAvailable(): boolean {
    return this.status === EnhancedSeatStatus.AVAILABLE && this.isSelectable && this.isActive;
  }

  get isHeld(): boolean {
    return this.status === EnhancedSeatStatus.HELD && 
           this.heldUntil && 
           this.heldUntil > new Date();
  }

  get isAccessible(): boolean {
    return this.accessibilityType !== AccessibilityType.NONE;
  }

  get isVip(): boolean {
    return this.type === EnhancedSeatType.VIP || 
           this.type === EnhancedSeatType.BOX ||
           this.type === EnhancedSeatType.PREMIUM;
  }

  get effectivePrice(): number {
    return this.currentPrice || this.basePrice;
  }
}
