import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm"
import { Ticket } from "../../ticketing/entities/ticket.entity"

export enum RefundStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSED = "processed",
  REJECTED = "rejected",
  FAILED = "failed",
}

export enum RefundReason {
  EVENT_CANCELLED = "event_cancelled",
  EVENT_POSTPONED = "event_postponed",
  CUSTOMER_REQUEST = "customer_request",
  DUPLICATE_PURCHASE = "duplicate_purchase",
  TECHNICAL_ISSUE = "technical_issue",
  ORGANIZER_DISCRETION = "organizer_discretion",
  FRAUDULENT_ACTIVITY = "fraudulent_activity",
  OTHER = "other",
}

@Entity("refunds")
export class Refund {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  ticketId: string

  @Column({ type: "uuid" })
  eventId: string

  @Column({ type: "uuid" })
  organizerId: string

  @Column({ type: "uuid" })
  purchaserId: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  originalAmount: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  refundAmount: number

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  processingFee: number

  @Column({
    type: "enum",
    enum: RefundReason,
    default: RefundReason.CUSTOMER_REQUEST,
  })
  reason: RefundReason

  @Column({ type: "text", nullable: true })
  reasonDescription: string

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus

  @Column({ type: "uuid" })
  processedBy: string // Organizer or admin who processed the refund

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date

  @Column({ type: "varchar", length: 255, nullable: true })
  paymentMethod: string // Original payment method

  @Column({ type: "varchar", length: 255, nullable: true })
  refundTransactionId: string // External payment processor transaction ID

  @Column({ type: "text", nullable: true })
  internalNotes: string // Internal notes for organizers

  @Column({ type: "text", nullable: true })
  customerMessage: string // Message to send to customer

  @Column({ type: "boolean", default: false })
  isPartialRefund: boolean

  @Column({ type: "int", default: 0 })
  refundPercentage: number // Percentage of original amount being refunded

  @ManyToOne(
    () => Ticket,
    (ticket) => ticket.id,
  )
  @JoinColumn({ name: "ticketId" })
  ticket: Ticket

  @CreateDateColumn()
  createdAt: Date
}
