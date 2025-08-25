import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { PricingRule } from './pricing-rule.entity';

@Entity('pricing_history')
@Index(['eventId', 'createdAt'])
@Index(['eventId', 'ticketTierId', 'createdAt'])
export class PricingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('uuid', { nullable: true })
  ticketTierId: string;

  @Column('uuid', { nullable: true })
  pricingRuleId: string;

  @ManyToOne(() => PricingRule, { nullable: true })
  @JoinColumn({ name: 'pricingRuleId' })
  pricingRule: PricingRule;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adjustedPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Column({ type: 'varchar', length: 100 })
  adjustmentReason: string;

  @Column({ type: 'jsonb' })
  marketConditions: {
    demandScore: number;
    inventoryLevel: number;
    competitorAvgPrice?: number;
    timeToEvent: number;
    seasonalFactor?: number;
    abTestVariant?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    appliedRules: string[];
    calculationTime: number;
    confidence: number;
    expectedRevenue: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}
