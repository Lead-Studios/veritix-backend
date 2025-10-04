import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
} from "typeorm";
import { Order } from "./order.entity";

export type PaymentStatus = "initiated" | "held" | "captured" | "refunded" | "failed";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Order, (o) => o.payment)
  order: Order;

  @Column()
  providerPaymentId: string; // id from Stripe/Paystack or internal

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: "held" })
  status: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;
}
