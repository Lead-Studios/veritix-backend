import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Order } from "./order.entity";
import { TicketTier } from "../../tickets/entities/ticket-tier.entity";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order: Order;

  @Column()
  ticketTypeId: string;

  @ManyToOne(() => TicketTier)
  @JoinColumn({ name: "ticketTypeId" })
  ticketType: TicketTier;

  @Column({ type: "int" })
  quantity: number;

  @Column("decimal", { precision: 10, scale: 2 })
  price: number;
}