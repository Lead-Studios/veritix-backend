import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum ReminderType {
  EMAIL = "email",
  PUSH = "push",
  SMS = "sms",
  // Add other types as needed
}

export enum ReminderStatus {
  ACTIVE = "active", // Reminder is configured and scheduled
  INACTIVE = "inactive", // Reminder is configured but temporarily disabled
  TRIGGERED = "triggered", // Reminder has been sent
  FAILED = "failed", // Reminder failed to send
  CANCELLED = "cancelled", // Reminder was explicitly cancelled
}

@Entity("reminders")
@Index(["eventId", "status"])
@Index(["organizerId", "status"])
export class Reminder {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  eventId: string

  @Column()
  organizerId: string

  @Column({
    type: "enum",
    enum: ReminderType,
  })
  type: ReminderType

  @Column({ type: "int" })
  offsetMinutes: number // Minutes before event start time

  @Column({ type: "varchar", length: 500 })
  messageTemplate: string

  @Column({ type: "varchar", length: 200, nullable: true })
  subject: string // For email reminders

  @Column({
    type: "enum",
    enum: ReminderStatus,
    default: ReminderStatus.ACTIVE,
  })
  status: ReminderStatus

  @Column({ type: "timestamp with time zone", nullable: true })
  lastTriggeredAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
