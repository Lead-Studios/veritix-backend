import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('purchase_logs')
export class PurchaseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, event => event.purchaseLogs)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @Column({ name: 'ticket_type' })
  ticketType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ name: 'discount_applied', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountApplied: number;

  @Column({ name: 'processing_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  processingFee: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 10, scale: 2 })
  netAmount: number;

  @Column({ default: 'completed' })
  status: string; // 'pending', 'completed', 'failed', 'refunded'

  @CreateDateColumn({ name: 'purchased_at' })
  purchasedAt: Date;
}