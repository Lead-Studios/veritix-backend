import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

export enum PricingRuleType {
  TIME_BASED = 'time_based',
  DEMAND_BASED = 'demand_based',
  INVENTORY_BASED = 'inventory_based',
  COMPETITOR_BASED = 'competitor_based',
  SEASONAL = 'seasonal',
  DYNAMIC_MULTIPLIER = 'dynamic_multiplier',
}

export enum PricingRuleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PricingRuleType,
    default: PricingRuleType.TIME_BASED,
  })
  type: PricingRuleType;

  @Column({
    type: 'enum',
    enum: PricingRuleStatus,
    default: PricingRuleStatus.ACTIVE,
  })
  status: PricingRuleStatus;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'jsonb' })
  conditions: {
    timeRanges?: Array<{
      startDate: string;
      endDate: string;
      multiplier: number;
    }>;
    demandThresholds?: Array<{
      minDemand: number;
      maxDemand: number;
      multiplier: number;
    }>;
    inventoryThresholds?: Array<{
      minInventory: number;
      maxInventory: number;
      multiplier: number;
    }>;
    competitorPriceRanges?: Array<{
      minPrice: number;
      maxPrice: number;
      multiplier: number;
    }>;
    seasonalFactors?: Array<{
      month: number;
      multiplier: number;
    }>;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.5 })
  minMultiplier: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3.0 })
  maxMultiplier: number;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
