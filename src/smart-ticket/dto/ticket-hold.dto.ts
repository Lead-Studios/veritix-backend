import { IsUUID, IsNotEmpty, IsInt, Min, Max, IsOptional } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { TicketHoldStatus } from "../entities/ticket-hold.entity"

export class CreateTicketHoldDto {
  @ApiProperty({
    description: "The ID of the event the tickets belong to",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The ID of the ticket type to hold",
    example: "f1e2d3c4-b5a6-9876-5432-10fedcba9876",
  })
  @IsUUID()
  @IsNotEmpty()
  ticketTypeId: string

  @ApiProperty({
    description: "The quantity of tickets to hold",
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number

  @ApiProperty({
    description: "Duration of the hold in minutes (e.g., 5 for 5 minutes)",
    example: 5,
    minimum: 1,
    maximum: 30, // Example max hold time
    default: 5,
  })
  @IsInt()
  @Min(1)
  @Max(30) // Define a reasonable maximum hold time
  @IsOptional()
  holdDurationMinutes = 5
}

export class TicketHoldDto {
  @ApiProperty({ example: "h1o2l3d4-e5x6-7890-1234-567890abcdef" })
  id: string

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-1234-567890abcdef" })
  eventId: string

  @ApiProperty({ example: "f1e2d3c4-b5a6-9876-5432-10fedcba9876" })
  ticketTypeId: string

  @ApiProperty({ example: 2 })
  quantity: number

  @ApiProperty({ example: "user-abc-456" })
  userId: string

  @ApiProperty({ example: "2025-12-31T10:05:00.000Z" })
  expiresAt: Date

  @ApiProperty({ enum: TicketHoldStatus, example: TicketHoldStatus.ACTIVE })
  status: TicketHoldStatus

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z" })
  createdAt: Date

  @ApiProperty({ example: "2025-12-31T10:00:00.000Z" })
  updatedAt: Date
}
