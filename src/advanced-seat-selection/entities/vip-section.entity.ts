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
import { EnhancedSeat } from './enhanced-seat.entity';

export enum VipSectionType {
  LUXURY_BOX = 'luxury_box',
  PREMIUM_SEATING = 'premium_seating',
  VIP_LOUNGE = 'vip_lounge',
  CORPORATE_BOX = 'corporate_box',
  SUITE = 'suite',
  CLUB_LEVEL = 'club_level',
  FIELD_LEVEL = 'field_level',
}

export enum VipAccessLevel {
  STANDARD_VIP = 'standard_vip',
  PREMIUM_VIP = 'premium_vip',
  PLATINUM_VIP = 'platinum_vip',
  DIAMOND_VIP = 'diamond_vip',
  EXECUTIVE = 'executive',
}

@Entity('vip_sections')
@Index(['venueMapId', 'isActive'])
@Index(['vipType', 'accessLevel'])
export class VipSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, (venueMap) => venueMap.vipSections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: VipSectionType,
    default: VipSectionType.PREMIUM_SEATING,
  })
  vipType: VipSectionType;

  @Column({
    type: 'enum',
    enum: VipAccessLevel,
    default: VipAccessLevel.STANDARD_VIP,
  })
  accessLevel: VipAccessLevel;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  occupiedSeats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  packagePrice: number; // For full section bookings

  @Column({ type: 'jsonb' })
  boundaries: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rectangle' | 'circle' | 'polygon';
    points?: Array<{ x: number; y: number }>; // For polygon shapes
  };

  @Column({ type: 'jsonb', nullable: true })
  amenities: {
    privateEntrance: boolean;
    dedicatedConcierge: boolean;
    premiumFood: boolean;
    openBar: boolean;
    vipParking: boolean;
    privateRestrooms: boolean;
    climateControl: boolean;
    premiumSeating: boolean;
    waitService: boolean;
    meetAndGreet: boolean;
    exclusiveLounge: boolean;
    customServices: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  inclusions: {
    food: string[];
    beverages: string[];
    merchandise: string[];
    services: string[];
    experiences: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
    minimumPurchase?: number;
    maximumPurchase?: number;
    requiresMembership: boolean;
    ageRestrictions?: {
      min?: number;
      max?: number;
    };
    dressCode?: string;
    advanceBookingRequired?: number; // Days in advance
    cancellationPolicy?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  contactInfo: {
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    conciergePhone?: string;
    emergencyContact?: string;
  };

  @Column({ type: 'varchar', length: 20, default: '#FFD700' })
  colorCode: string; // Gold default for VIP

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isBookable: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @OneToMany(() => EnhancedSeat, (seat) => seat, {
    createForeignKeyConstraints: false,
  })
  seats: EnhancedSeat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get occupancyRate(): number {
    return this.capacity > 0 ? (this.occupiedSeats / this.capacity) * 100 : 0;
  }

  get availableSeats(): number {
    return Math.max(0, this.capacity - this.occupiedSeats);
  }

  get isFullyBooked(): boolean {
    return this.occupiedSeats >= this.capacity;
  }

  get hasAvailability(): boolean {
    return this.isActive && this.isBookable && !this.isFullyBooked;
  }
}
