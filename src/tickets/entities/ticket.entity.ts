import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";
import { Conference } from "src/conference/entities/conference.entity";
import { User } from "../../users/entities/user.entity";

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  conferenceId: string;

  @Column()
  userId: string;

  @Column("decimal", { precision: 10, scale: 2 })
  pricePerTicket: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ nullable: true })
  receiptId: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Conference)
  conference: Conference;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  name: string;

  @ManyToOne(() => Event, (event) => event.tickets, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "timestamp" })
  deadlineDate: Date;

  @Column({ default: false })
  isReserved: boolean;

  @Column({ default: false })
  isUsed: boolean;

  // new fields for ticket history and receipt
  @Column({ nullable: true })
  transactionId: string;

  @CreateDateColumn()
  purchaseDate: Date;

  @Column()
  status: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true })
token: string;

}
