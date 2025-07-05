import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm"
import { Event } from "./event.entity"

export enum TicketStatus {
  ACTIVE = "active",
  USED = "used",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255, unique: true })
  ticketNumber: string

  @Column({ type: "uuid" })
  eventId: string

  @Column({ type: "uuid" })
  purchaserId: string

  @Column({ type: "varchar", length: 255 })
  purchaserName: string

  @Column({ type: "varchar", length: 255 })
  purchaserEmail: string

  @Column({ type: "text" })
  qrCodeData: string

  @Column({ type: "text" })
  qrCodeImage: string // Base64 encoded QR code image

  @Column({ type: "varchar", length: 500 })
  secureHash: string // Signed hash for verification

  @Column({
    type: "enum",
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus

  @Column({ type: "timestamp", nullable: true })
  usedAt: Date

  @Column({ type: "uuid", nullable: true })
  scannedBy: string // Organizer/staff who scanned the ticket

  @Column({ type: "decimal", precision: 10, scale: 2 })
  pricePaid: number

  @Column({ type: "timestamp" })
  purchaseDate: Date

  @ManyToOne(
    () => Event,
    (event) => event.tickets,
  )
  @JoinColumn({ name: "eventId" })
  event: Event

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
