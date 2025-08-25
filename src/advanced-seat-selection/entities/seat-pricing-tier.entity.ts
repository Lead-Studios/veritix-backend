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

export enum PricingTierType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  LAST_MINUTE = 'last_minute',
  GROUP_DISCOUNT = 'group_discount',
  ACCESSIBILITY = 'accessibility',
}

@Entity('seat_pricing_tiers')
@Index(['venueMapId', 'isActive'])
@Index(['tierType', 'isActive'])
export class SeatPricingTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PricingTierType,
    default: PricingTierType.STANDARD,
  })
  tierType: PricingTierType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  priceMultiplier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ type: 'jsonb', nullable: true })
  dynamicPricing: {
    enabled: boolean;
    demandMultiplier?: number;
    timeBasedMultiplier?: number;
    inventoryThresholds?: Array<{
      percentage: number;
      multiplier: number;
    }>;
  };

  @Column({ type: 'varchar', length: 20, default: '#3B82F6' })
  colorCode: string; // Hex color for visual representation

  @Column({ type: 'jsonb', nullable: true })
  benefits: {
    description: string[];
    amenities: string[];
    perks: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
    minQuantity?: number;
    maxQuantity?: number;
    requiresMembership?: boolean;
    ageRestrictions?: {
      min?: number;
      max?: number;
    };
    availabilityWindow?: {
      startDate?: Date;
      endDate?: Date;
    };
  };

  @Column({ type: 'int', default: 1 })
  priority: number; // Higher priority tiers are shown first

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @OneToMany(() => EnhancedSeat, (seat) => seat.pricingTier)
  seats: EnhancedSeat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get effectivePrice(): number {
    return this.basePrice * this.priceMultiplier;
  }

  get isWithinPriceBounds(): boolean {
    const price = this.effectivePrice;
    const withinMin = !this.minPrice || price >= this.minPrice;
    const withinMax = !this.maxPrice || price <= this.maxPrice;
    return withinMin && withinMax;
  }
}
