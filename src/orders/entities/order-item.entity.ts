import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { TicketType } from '../../ticket-types/entities/ticket-type.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column('uuid')
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { eager: true })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPriceUSD: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotalUSD: number;
}
