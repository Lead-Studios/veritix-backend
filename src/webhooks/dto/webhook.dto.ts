import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsDateString,
} from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { WebhookStatus, WebhookType, WebhookEventType } from "../entities/webhook.entity"
import { ModerationActionType } from "../entities/moderation-log.entity"

export class CreateWebhookDto {
  @ApiProperty({
    description: "The ID of the event this webhook is associated with",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The URL of the external webhook endpoint (e.g., Slack, Discord)",
    example: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  })
  @IsUrl()
  @IsNotEmpty()
  url: string

  @ApiProperty({
    description: "Type of the webhook to determine payload format",
    enum: WebhookType,
    example: WebhookType.SLACK,
  })
  @IsEnum(WebhookType)
  @IsNotEmpty()
  type: WebhookType

  @ApiProperty({
    description: "Array of event types that this webhook should listen for",
    enum: WebhookEventType,
    isArray: true,
    example: [WebhookEventType.MESSAGE_SENT, WebhookEventType.USER_JOINED],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  @IsNotEmpty()
  events: WebhookEventType[]

  @ApiProperty({
    description: "Whether moderation should be applied to messages before sending via this webhook",
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  moderationEnabled?: boolean = false

  @ApiProperty({
    description: "Optional description for the webhook",
    example: "Slack channel for event chat logs",
    required: false,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string
}

export class UpdateWebhookDto {
  @ApiProperty({
    description: "The URL of the external webhook endpoint (e.g., Slack, Discord)",
    example: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  url?: string

  @ApiProperty({
    description: "Type of the webhook to determine payload format",
    enum: WebhookType,
    required: false,
  })
  @IsEnum(WebhookType)
  @IsOptional()
  type?: WebhookType

  @ApiProperty({
    description: "Array of event types that this webhook should listen for",
    enum: WebhookEventType,
    isArray: true,
    required: false,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  @IsOptional()
  events?: WebhookEventType[]

  @ApiProperty({
    description: "Whether moderation should be applied to messages before sending via this webhook",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  moderationEnabled?: boolean

  @ApiProperty({
    description: "Optional description for the webhook",
    required: false,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string

  @ApiProperty({
    description: "Status of the webhook",
    enum: WebhookStatus,
    required: false,
  })
  @IsEnum(WebhookStatus)
  @IsOptional()
  status?: WebhookStatus
}

export class WebhookDto {
  @ApiProperty({ example: "w1e2b3h4-o5o6-7890-1234-567890abcdef" })
  id: string

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-1234-567890abcdef" })
  eventId: string

  @ApiProperty({ example: "https://hooks.slack.com/services/..." })
  url: string

  @ApiProperty({ enum: WebhookType, example: WebhookType.SLACK })
  type: WebhookType

  @ApiProperty({ enum: WebhookEventType, isArray: true, example: [WebhookEventType.MESSAGE_SENT] })
  events: WebhookEventType[]

  @ApiProperty({ example: true })
  moderationEnabled: boolean

  @ApiProperty({ example: "Slack channel for event chat logs", nullable: true })
  description?: string

  @ApiProperty({ enum: WebhookStatus, example: WebhookStatus.ACTIVE })
  status: WebhookStatus

  @ApiProperty({ example: "2025-12-30T08:00:00.000Z" })
  createdAt: Date

  @ApiProperty({ example: "2025-12-30T09:00:00.000Z" })
  updatedAt: Date
}

export class ChatMessageDto {
  @ApiProperty({
    description: "The ID of the event the message belongs to",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The ID of the user who sent the message",
    example: "u1s2e3r4-i5d6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @ApiProperty({
    description: "The content of the chat message",
    example: "Hello everyone, excited for the event!",
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string

  @ApiProperty({
    description: "Optional ID of the message, if already persisted in chat system",
    example: "m1e2s3s4-a5g6-7890-1234-567890abcdef",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  messageId?: string

  @ApiProperty({
    description: "Timestamp when the message was sent (ISO 8601 format)",
    example: "2025-12-31T10:00:00Z",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string = new Date().toISOString()
}

export class ModerationActionDto {
  @ApiProperty({
    description: "The ID of the event where the action occurred",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The ID of the message being moderated (if applicable)",
    example: "m1e2s3s4-a5g6-7890-1234-567890abcdef",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  messageId?: string

  @ApiProperty({
    description: "The ID of the user being moderated (if applicable)",
    example: "u1s2e3r4-i5d6-7890-1234-567890abcdef",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  userId?: string

  @ApiProperty({
    description: "The type of moderation action",
    enum: ModerationActionType,
    example: ModerationActionType.FLAGGED,
  })
  @IsEnum(ModerationActionType)
  @IsNotEmpty()
  action: ModerationActionType

  @ApiProperty({
    description: "Reason for the moderation action",
    example: "Contains hate speech",
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string

  @ApiProperty({
    description: "The ID of the moderator performing the action",
    example: "mod-user-id-123",
  })
  @IsUUID()
  @IsNotEmpty()
  moderatedBy: string
}

export class ModerationLogDto {
  @ApiProperty({ example: "l1o2g3i4-d5e6-7890-1234-567890abcdef" })
  id: string

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-1234-567890abcdef" })
  eventId: string

  @ApiProperty({ example: "m1e2s3s4-a5g6-7890-1234-567890abcdef", nullable: true })
  messageId?: string

  @ApiProperty({ example: "u1s2e3r4-i5d6-7890-1234-567890abcdef", nullable: true })
  userId?: string

  @ApiProperty({ enum: ModerationActionType, example: ModerationActionType.FLAGGED })
  action: ModerationActionType

  @ApiProperty({ example: "Contains hate speech", nullable: true })
  reason?: string

  @ApiProperty({ example: "mod-user-id-123" })
  moderatedBy: string

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z" })
  timestamp: Date
}
