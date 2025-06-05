import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";
import { Ticket } from "../../tickets/entities/ticket.entity";
import { User } from "../../users/entities/user.entity";
import { GroupTicket } from "./group-ticket.entity";

@Entity()
export class TicketPurchase {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  receiptId: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Event)
  event: Event;

  @ManyToOne(() => Ticket)
  ticket: Ticket;

  @Column()
  ticketQuantity: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalPrice: number;

  @Column("jsonb")
  billingDetails: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };

  @Column("jsonb")
  addressDetails: {
    country: string;
    state: string;
    city: string;
    street: string;
    postalCode: string;
  };

  @CreateDateColumn()
  transactionDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // NEW: Group booking fields
  @Column({ default: false })
  isGroupBooking: boolean;

  @Column({ nullable: true })
  @Index()
  groupCode: string;

  @Column({ nullable: true })
  groupName: string;

  @Column({ nullable: true })
  groupDescription: string;

  @Column({ nullable: true })
  groupLeaderId: string;

  @ManyToOne(() => User, { nullable: true })
  groupLeader: User;

  // Self-referencing relationship for group bookings
  @ManyToOne(() => TicketPurchase, { nullable: true })
  parentGroupBooking: TicketPurchase;

  @OneToMany(() => TicketPurchase, (purchase) => purchase.parentGroupBooking)
  childGroupBookings: TicketPurchase[];

  @OneToMany(() => GroupTicket, (groupTicket) => groupTicket.purchase)
  groupTickets: GroupTicket[];
}
