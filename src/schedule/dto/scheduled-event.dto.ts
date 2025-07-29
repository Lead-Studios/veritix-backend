import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { ScheduledEventStatus } from "../entities/scheduled-event.entity"

export class CreateScheduledEventDto {
  @ApiProperty({
    description: "The ID of the event to be published",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The UTC date and time when the event should be published (ISO 8601 format)",
    example: "2025-12-31T10:00:00Z",
  })
  @IsDateString()
  @IsNotEmpty()
  publishAt: string // ISO 8601 string for date-time
}

export class UpdateScheduledEventDto {
  @ApiProperty({
    description: "The new UTC date and time for publication (ISO 8601 format)",
    example: "2026-01-15T14:30:00Z",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  publishAt?: string
}

export class ScheduledEventDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-1234-567890abcdef" })
  id: string

  @ApiProperty({ example: "event-xyz-123" })
  eventId: string

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z" })
  publishAt: Date

  @ApiProperty({ enum: ScheduledEventStatus, example: ScheduledEventStatus.PENDING })
  status: ScheduledEventStatus

  @ApiProperty({ example: "user-abc-456" })
  scheduledBy: string

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z", nullable: true })
  publishedAt?: Date

  @ApiProperty({ example: "2025-12-30T08:00:00.000Z" })
  createdAt: Date

  @ApiProperty({ example: "2025-12-30T09:00:00.000Z" })
  updatedAt: Date
}
