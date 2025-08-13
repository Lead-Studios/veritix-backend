import { Event } from '../../events/entities/event.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PricingStrategy } from '../enums/pricing-strategy.enum';

@Entity()
export class TicketTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int')
  quantity: number;

  @Column({ nullable: true })
  benefits: string;

  @Column({
    type: 'enum',
    enum: PricingStrategy,
    default: PricingStrategy.FIXED,
  })
  pricingStrategy: PricingStrategy;

  @Column('json', { nullable: true })
  pricingConfig: {
    maxPrice?: number;
    minPrice?: number;
    demandMultiplier?: number;
    thresholds?: Array<{
      soldPercentage: number;
      priceMultiplier: number;
    }>;
  };

  @ManyToOne(() => Event, (event) => event.ticketTiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;
}
