import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Order } from "./order.entity";
import { User } from "./user.entity";

export type EscrowStatus = "holding" | "released" | "refunded";

@Entity()
export class Escrow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Order, (o) => o.escrow)
  order: Order;

  @ManyToOne(() => User, { eager: true })
  beneficiary: User; // organizer who will receive funds on release

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: "holding" })
  status: EscrowStatus;

  @CreateDateColumn()
  createdAt: Date;
}
