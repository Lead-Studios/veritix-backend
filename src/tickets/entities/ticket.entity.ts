import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { TicketStatus } from "../enums/ticket-status.enum";

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  qrCode: string;

  @Column({ type: "text", nullable: true })
  qrCodeImage: string;

  @Column()
  ticketTypeId: string;

  @Column()
  eventId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column()
  userId: string;

  @Column()
  attendeeName: string;

  @Column()
  attendeeEmail: string;

  @Column({ type: "enum", enum: TicketStatus, default: TicketStatus.ISSUED })
  status: TicketStatus;

  @Column({ nullable: true })
  scannedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ type: "text", nullable: true })
  cancellationReason: string;

  @Column({ nullable: true })
  refundedAt: Date;

  @Column({ type: "int", default: 0 })
  transferCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;
}
