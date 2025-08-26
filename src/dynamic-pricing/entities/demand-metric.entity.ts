import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('demand_metrics')
@Index(['eventId', 'createdAt'])
@Index(['eventId', 'metricType', 'createdAt'])
export class DemandMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'varchar', length: 50 })
  metricType: string; // 'page_views', 'ticket_views', 'cart_additions', 'purchases', 'search_queries'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ type: 'varchar', length: 20 })
  timeWindow: string; // '1h', '6h', '24h', '7d'

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  demandScore: number; // Calculated demand score (0-100)

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source: string;
    userAgent?: string;
    referrer?: string;
    location?: string;
    sessionId?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
