import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Order } from "./order.entity";
import { User } from "./user.entity";

export type RefundStatus = "issued" | "failed";

@Entity()
export class Refund {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Order, { eager: true })
  order: Order;

  @ManyToOne(() => User, { eager: true })
  issuedBy: User; // organizer who issued the refund

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: "issued" })
  status: RefundStatus;

  @CreateDateColumn()
  createdAt: Date;
}
