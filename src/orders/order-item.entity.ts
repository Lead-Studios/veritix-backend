import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './orders.entity';
import { TicketType } from 'src/tickets-inventory/entities/ticket-type.entity';

/**
 * A single line item within an Order.
 *
 * Prices are snapshotted at order-creation time so historical orders remain
 * accurate even after the ticket type's price changes.
 */
@Entity('order_items')
@Index('IDX_order_items_order_id', ['orderId'])
@Index('IDX_order_items_ticket_type_id', ['ticketTypeId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', name: 'ticket_type_id' })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketType;

  @Column({ type: 'int' })
  quantity: number;

  /** Price per ticket in XLM at time of order creation. */
  @Column({ type: 'decimal', precision: 18, scale: 7, name: 'unit_price_xlm' })
  unitPriceXLM: number;

  /** quantity × unitPriceXLM, pre-computed and stored for fast aggregation. */
  @Column({ type: 'decimal', precision: 18, scale: 7, name: 'subtotal_xlm' })
  subtotalXLM: number;
}