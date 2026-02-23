import { Column, Entity, OneToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderStatus } from './enums/order-status.enum';
import { TicketType } from 'src/tickets-inventory/entities/ticket-type.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => Order, (order) => order.items)
  order: Order;

  @ManyToOne(() => TicketType)
  ticketType: TicketType;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'stellar_tx_hash' })
  stellarTxHash: string;

  @Column({ type: 'varchar', nullable: true, name: 'refund_tx_hash' })
  refundTxHash: string;

  @Column({ type: 'varchar', nullable: true, name: 'buyer_stellar_address' })
  buyerStellarAddress: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  /** Convenience: true if the order window has lapsed and it is still PENDING. */
  isExpired(): boolean {
    return this.status === OrderStatus.PENDING && new Date() >= this.expiresAt;
  }
}