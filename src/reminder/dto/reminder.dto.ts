import { IsUUID, IsNotEmpty, IsInt, Min, IsString, IsEnum, IsOptional, MaxLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { ReminderStatus, ReminderType } from "../entities/reminder.entity"

export class CreateReminderDto {
  @ApiProperty({
    description: "The ID of the event this reminder is for",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "Type of notification to send",
    enum: ReminderType,
    example: ReminderType.EMAIL,
  })
  @IsEnum(ReminderType)
  @IsNotEmpty()
  type: ReminderType

  @ApiProperty({
    description: "Number of minutes BEFORE the event start time to trigger the reminder",
    example: 1440, // 24 hours
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  offsetMinutes: number

  @ApiProperty({
    description: "Template for the reminder message (can include placeholders like {eventName}, {eventTime})",
    example: "Reminder: Your event '{eventName}' is starting in {offsetHours} hours!",
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  messageTemplate: string

  @ApiProperty({
    description: "Optional subject for email reminders",
    example: "Your VeriTix Event Reminder",
    required: false,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string
}

export class UpdateReminderDto {
  @ApiProperty({
    description: "New type of notification to send",
    enum: ReminderType,
    required: false,
  })
  @IsEnum(ReminderType)
  @IsOptional()
  type?: ReminderType

  @ApiProperty({
    description: "New number of minutes BEFORE the event start time to trigger the reminder",
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  offsetMinutes?: number

  @ApiProperty({
    description: "New template for the reminder message",
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  messageTemplate?: string

  @ApiProperty({
    description: "New optional subject for email reminders",
    maxLength: 200,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string

  @ApiProperty({
    description: "New status for the reminder (e.g., to deactivate)",
    enum: ReminderStatus,
    required: false,
  })
  @IsEnum(ReminderStatus)
  @IsOptional()
  status?: ReminderStatus
}

export class ReminderDto {
  @ApiProperty({ example: "r1e2m3i4-n5d6-7890-1234-567890abcdef" })
  id: string

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-1234-567890abcdef" })
  eventId: string

  @ApiProperty({ example: "o1r2g3a4-n5i6-7890-1234-567890abcdef" })
  organizerId: string

  @ApiProperty({ enum: ReminderType, example: ReminderType.EMAIL })
  type: ReminderType

  @ApiProperty({ example: 1440 })
  offsetMinutes: number

  @ApiProperty({ example: "Reminder: Your event '{eventName}' is starting in {offsetHours} hours!" })
  messageTemplate: string

  @ApiProperty({ example: "Your VeriTix Event Reminder", nullable: true })
  subject?: string

  @ApiProperty({ enum: ReminderStatus, example: ReminderStatus.ACTIVE })
  status: ReminderStatus

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z", nullable: true })
  lastTriggeredAt?: Date

  @ApiProperty({ example: "2025-12-30T08:00:00.000Z" })
  createdAt: Date

  @ApiProperty({ example: "2025-12-30T09:00:00.000Z" })
  updatedAt: Date
}
