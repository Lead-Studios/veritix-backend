import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

export enum ABTestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('ab_tests')
export class ABTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({
    type: 'enum',
    enum: ABTestStatus,
    default: ABTestStatus.DRAFT,
  })
  status: ABTestStatus;

  @Column({ type: 'jsonb' })
  variants: Array<{
    id: string;
    name: string;
    description: string;
    trafficPercentage: number;
    pricingStrategy: {
      baseMultiplier: number;
      rules: any[];
    };
  }>;

  @Column({ type: 'varchar', length: 100 })
  metric: string; // 'revenue', 'conversion_rate', 'tickets_sold'

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 95.0 })
  confidenceLevel: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minimumDetectableEffect: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  results: {
    variants: Array<{
      id: string;
      participants: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
      averageOrderValue: number;
    }>;
    winner?: string;
    significance: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
