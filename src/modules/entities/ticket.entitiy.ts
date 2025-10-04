import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./user.entity";
import { Order } from "./order.entity";

export type TicketStatus = "available" | "sold" | "validated" | "refunded";

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  eventName: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @Column({ default: "available" })
  status: TicketStatus;

  // owner/organizer of this ticket
  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  organizer: User;

  @ManyToOne(() => Order, (order) => order.ticket, { nullable: true })
  order: Order;
}
