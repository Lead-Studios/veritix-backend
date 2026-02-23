import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from './enums/order-status.enum';

@Entity('orders')
@Index('IDX_orders_user_id', ['userId'])
@Index('IDX_orders_event_id', ['eventId'])
@Index('IDX_orders_stellar_memo', ['stellarMemo'], { unique: true })
@Index('IDX_orders_stellar_tx_hash', ['stellarTxHash'])
@Index('IDX_orders_status', ['status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'event_id' })
  eventId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 7,
    name: 'total_amount_xlm',
  })
  totalAmountXLM: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 7,
    name: 'total_amount_usd',
  })
  totalAmountUSD: number;

  @Column({ type: 'varchar', length: 28, name: 'stellar_memo', unique: true })
  stellarMemo: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'stellar_tx_hash', nullable: true })
  stellarTxHash: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Convenience: true if the order window has lapsed and it is still PENDING. */
  isExpired(): boolean {
    return this.status === OrderStatus.PENDING && new Date() >= this.expiresAt;
  }
}