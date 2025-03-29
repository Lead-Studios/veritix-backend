import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsDateString, IsNumber, IsArray, ValidateNested, IsOptional } from "class-validator"
import { Type } from "class-transformer"

class TicketTypeDto {
  @ApiProperty({
    description: "Ticket type ID",
    example: "GENERAL",
  })
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({
    description: "Ticket type name",
    example: "General Admission",
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({
    description: "Ticket price",
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  price?: number

  @ApiProperty({
    description: "Number of tickets available",
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  available?: number
}

export class UpdateEventDto {
  @ApiProperty({
    description: "Event name",
    example: "Web3 Conference 2025",
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({
    description: "Event description",
    example: "The premier conference for blockchain and web3 technologies",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: "Event venue",
    example: "Blockchain Arena",
    required: false,
  })
  @IsString()
  @IsOptional()
  venue?: string

  @ApiProperty({
    description: "Event date and time",
    example: "2025-04-15T18:00:00Z",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string

  @ApiProperty({
    description: "Event capacity",
    example: 1000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  capacity?: number

  @ApiProperty({
    description: "Ticket types",
    type: [TicketTypeDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  @IsOptional()
  ticketTypes?: TicketTypeDto[]

  @ApiProperty({
    description: "Event organizer",
    example: "Web3 Events Inc.",
    required: false,
  })
  @IsString()
  @IsOptional()
  organizer?: string
}

