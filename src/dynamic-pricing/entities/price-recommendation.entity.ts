import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

export enum RecommendationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('price_recommendations')
@Index(['eventId', 'status', 'createdAt'])
@Index(['eventId', 'ticketTierId', 'createdAt'])
export class PriceRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('uuid', { nullable: true })
  ticketTierId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  recommendedPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  priceChange: number; // Percentage change

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  expectedRevenueIncrease: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number; // 0-100

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.PENDING,
  })
  status: RecommendationStatus;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'jsonb' })
  factors: {
    demandScore: number;
    inventoryLevel: number;
    timeToEvent: number;
    competitorPricing: number;
    seasonalFactor: number;
    historicalPerformance: number;
  };

  @Column({ type: 'jsonb' })
  marketAnalysis: {
    demandTrend: string; // 'increasing', 'decreasing', 'stable'
    competitivePosition: string; // 'above', 'below', 'aligned'
    priceElasticity: number;
    optimalPriceRange: {
      min: number;
      max: number;
    };
  };

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ type: 'timestamp', nullable: true })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
