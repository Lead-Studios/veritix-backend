import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsDateString, IsNumber, IsArray, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

class TicketTypeDto {
  @ApiProperty({
    description: "Ticket type ID",
    example: "GENERAL",
  })
  @IsString()
  @IsNotEmpty()
  id: string

  @ApiProperty({
    description: "Ticket type name",
    example: "General Admission",
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: "Ticket price",
    example: 100,
  })
  @IsNumber()
  price: number

  @ApiProperty({
    description: "Number of tickets available",
    example: 500,
  })
  @IsNumber()
  available: number
}

export class CreateEventDto {
  @ApiProperty({
    description: "Event name",
    example: "Web3 Conference 2025",
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: "Event description",
    example: "The premier conference for blockchain and web3 technologies",
  })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty({
    description: "Event venue",
    example: "Blockchain Arena",
  })
  @IsString()
  @IsNotEmpty()
  venue: string

  @ApiProperty({
    description: "Event date and time",
    example: "2025-04-15T18:00:00Z",
  })
  @IsDateString()
  date: string

  @ApiProperty({
    description: "Event capacity",
    example: 1000,
  })
  @IsNumber()
  capacity: number

  @ApiProperty({
    description: "Ticket types",
    type: [TicketTypeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes: TicketTypeDto[]

  @ApiProperty({
    description: "Event organizer",
    example: "Web3 Events Inc.",
  })
  @IsString()
  @IsNotEmpty()
  organizer: string
}

