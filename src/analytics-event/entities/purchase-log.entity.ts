import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('purchase_logs')
@Index(['eventId', 'createdAt'])
export class PurchaseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  event: Event;

  @Column()
  userId: string;

  @Column()
  ticketType: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ nullable: true })
  discountCode?: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ nullable: true })
  trafficSource?: string;

  @Column({ nullable: true })
  utm_source?: string;

  @Column({ nullable: true })
  utm_medium?: string;

  @Column({ nullable: true })
  utm_campaign?: string;

  @Column({ default: 'completed' })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @CreateDateColumn()
  createdAt: Date;
}
