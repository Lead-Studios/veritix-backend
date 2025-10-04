import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Ticket } from "./ticket.entity";
import { Payment } from "./payment.entity";
import { Escrow } from "./escrow.entity";

export type OrderStatus = "pending" | "paid" | "released" | "refunded" | "cancelled";

@Entity()
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (u) => u.orders, { eager: true })
  buyer: User;

  @ManyToOne(() => Ticket, { eager: true })
  ticket: Ticket;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: "pending" })
  status: OrderStatus;

  @OneToOne(() => Payment, (p) => p.order, { cascade: true, eager: true })
  @JoinColumn()
  payment: Payment;

  @OneToOne(() => Escrow, (e) => e.order, { cascade: true, eager: true })
  @JoinColumn()
  escrow: Escrow;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
