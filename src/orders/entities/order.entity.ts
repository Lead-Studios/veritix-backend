import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmountUSD: number;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  totalAmountXLM: number;

  @Column({ unique: true })
  stellarMemo: string;

  @Column({ nullable: true, unique: true })
  stellarTxHash: string;

  @Column({ nullable: true, unique: true })
  refundTxHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Ticket, (ticket) => ticket.order)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
