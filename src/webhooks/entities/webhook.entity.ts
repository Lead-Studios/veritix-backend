import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum WebhookType {
  SLACK = "slack",
  DISCORD = "discord",
  CUSTOM = "custom", // For generic webhooks with custom payload
}

export enum WebhookEventType {
  MESSAGE_SENT = "message_sent",
  MESSAGE_DELETED = "message_deleted",
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left",
  USER_BANNED = "user_banned",
  MESSAGE_FLAGGED = "message_flagged",
  // Add more event types as needed
}

export enum WebhookStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", // Manually disabled
  FAILED = "failed", // Automatically disabled after too many failures
}

@Entity("webhooks")
@Index(["eventId", "status"])
@Index(["type", "status"])
export class Webhook {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  eventId: string

  @Column()
  url: string

  @Column({
    type: "enum",
    enum: WebhookType,
  })
  type: WebhookType

  @Column({
    type: "enum",
    enum: WebhookEventType,
    array: true,
  })
  events: WebhookEventType[]

  @Column({ default: false })
  moderationEnabled: boolean

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string

  @Column({
    type: "enum",
    enum: WebhookStatus,
    default: WebhookStatus.ACTIVE,
  })
  status: WebhookStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
