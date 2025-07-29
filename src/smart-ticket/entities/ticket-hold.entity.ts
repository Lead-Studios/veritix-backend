import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum TicketHoldStatus {
  ACTIVE = "active", // Tickets are held
  CONFIRMED = "confirmed", // Hold converted to a sale
  EXPIRED = "expired", // Hold expired and tickets re-released automatically
  CANCELLED = "cancelled", // Hold explicitly cancelled by user/system
}

@Entity("ticket_holds")
@Index(["eventId", "ticketTypeId", "status"])
@Index(["userId", "status"])
@Index(["expiresAt", "status"])
export class TicketHold {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  eventId: string

  @Column()
  ticketTypeId: string

  @Column({ type: "int" })
  quantity: number

  @Column()
  userId: string // User who initiated the hold

  @Column({ type: "timestamp with time zone" })
  expiresAt: Date

  @Column({
    type: "enum",
    enum: TicketHoldStatus,
    default: TicketHoldStatus.ACTIVE,
  })
  status: TicketHoldStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
