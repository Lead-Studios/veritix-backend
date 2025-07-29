import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

export enum ModerationActionType {
  FLAGGED = "flagged", // Message flagged for review
  DELETED = "deleted", // Message deleted
  USER_BANNED = "user_banned", // User banned from chat/event
  WARNING = "warning", // Warning issued to user
  APPROVED = "approved", // Message/user explicitly approved after review
}

@Entity("moderation_logs")
@Index(["eventId", "action"])
@Index(["userId"])
@Index(["messageId"])
export class ModerationLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  eventId: string

  @Column({ nullable: true })
  messageId: string

  @Column({ nullable: true })
  userId: string

  @Column({
    type: "enum",
    enum: ModerationActionType,
  })
  action: ModerationActionType

  @Column({ type: "varchar", length: 500, nullable: true })
  reason: string

  @Column()
  moderatedBy: string // ID of the moderator (user or system)

  @CreateDateColumn()
  timestamp: Date
}
