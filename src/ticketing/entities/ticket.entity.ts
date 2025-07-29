import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm"
import { TicketingEvent, TicketType } from "./event.entity"

export enum TicketStatus {
  ACTIVE = "active",
  USED = "used",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum TicketFormat {
  QR = "qr",
  NFT = "nft",
}

@Entity("ticketing_tickets")
export class TicketingTicket {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255, unique: true })
  ticketNumber: string

  @Column({ type: "uuid" })
  eventId: string

  @Column({ type: "varchar", length: 255, nullable: true })
  conferenceId: string

  @Column({ type: "uuid" })
  purchaserId: string

  @Column({ type: "varchar", length: 255 })
  purchaserName: string

  @Column({ type: "varchar", length: 255 })
  purchaserEmail: string

  @Column({ type: "text", nullable: true })
  qrCodeData: string

  @Column({ type: "text", nullable: true })
  qrCodeImage: string // Base64 encoded QR code image

  @Column({ type: "varchar", length: 500, nullable: true })
  secureHash: string // Signed hash for verification

  @Column({
    type: "enum",
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus

  @Column({
    type: "enum",
    enum: TicketFormat,
    default: TicketFormat.QR,
  })
  format: TicketFormat

  // NFT-specific fields
  @Column({ type: "varchar", length: 255, nullable: true })
  nftTokenId: string

  @Column({ type: "varchar", length: 255, nullable: true })
  nftContractAddress: string

  @Column({ type: "varchar", length: 255, nullable: true })
  nftTokenUri: string

  @Column({ type: "varchar", length: 255, nullable: true })
  nftTransactionHash: string

  @Column({ type: "varchar", length: 255, nullable: true })
  nftPlatform: string // 'polygon', 'zora', etc.

  @Column({ type: "text", nullable: true })
  nftMetadata: string // JSON string of NFT metadata

  @Column({ type: "timestamp", nullable: true })
  usedAt: Date

  @Column({ type: "uuid", nullable: true })
  scannedBy: string // Organizer/staff who scanned the ticket

  @Column({ type: "decimal", precision: 10, scale: 2 })
  pricePaid: number

  @Column({ type: "timestamp" })
  purchaseDate: Date

  @ManyToOne(
    () => TicketingEvent,
    (event) => event.ticketingTickets,
  )
  @JoinColumn({ name: "eventId" })
  event: TicketingEvent

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
