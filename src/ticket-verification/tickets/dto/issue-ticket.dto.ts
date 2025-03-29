import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsEthereumAddress, IsOptional, IsBoolean } from "class-validator"

export class IssueTicketDto {
  @ApiProperty({
    description: "The Ethereum address of the ticket recipient",
    example: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  to: string

  @ApiProperty({
    description: "The ID of the event",
    example: "EVENT_123",
  })
  @IsString()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "The seat information for the ticket",
    example: "VIP Section A, Row 1, Seat 5",
    required: false,
  })
  @IsString()
  @IsOptional()
  seat?: string

  @ApiProperty({
    description: "Whether the ticket can be resold",
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  resalable?: boolean
}

