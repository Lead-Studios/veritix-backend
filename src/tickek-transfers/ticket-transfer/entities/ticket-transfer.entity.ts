import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm"
import { User } from "../../users/entities/user.entity"
import { Ticket } from "../../tickets/entities/ticket.entity"

export enum TransferStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum TransferType {
  RESALE = "resale",
  TRANSFER = "transfer",
}

@Entity()
export class TicketTransfer {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => User)
  @JoinColumn()
  sender: User

  @Column()
  senderId: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  recipient: User

  @Column({ nullable: true })
  recipientId: string

  @Column({ nullable: true })
  recipientEmail: string

  @ManyToOne(() => Ticket)
  @JoinColumn()
  ticket: Ticket

  @Column()
  ticketId: string

  @Column({
    type: "enum",
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus

  @Column({
    type: "enum",
    enum: TransferType,
  })
  type: TransferType

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  price: number

  @Column({ nullable: true })
  verificationCode: string

  @Column({ nullable: true })
  verificationExpiry: Date

  @Column({ default: false })
  isVerified: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  completedAt: Date
}

