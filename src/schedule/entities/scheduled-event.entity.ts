import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum ScheduledEventStatus {
  PENDING = "pending",
  PUBLISHED = "published",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

@Entity("scheduled_events")
@Index(["eventId", "status"])
@Index(["publishAt", "status"])
export class ScheduledEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  eventId: string

  @Column({ type: "timestamp with time zone" })
  publishAt: Date

  @Column({
    type: "enum",
    enum: ScheduledEventStatus,
    default: ScheduledEventStatus.PENDING,
  })
  status: ScheduledEventStatus

  @Column()
  scheduledBy: string

  @Column({ type: "timestamp with time zone", nullable: true })
  publishedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
