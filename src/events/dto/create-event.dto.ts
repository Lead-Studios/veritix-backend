import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { EventStatus } from "../../common/enums/event-status.enum";

class TicketTier {
  @ApiProperty({
    description: "Name of the ticket tier",
    example: "VIP",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Description of what this ticket tier includes",
    example: "Front row seating with meet & greet",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Base price for tickets in this tier",
    example: 199.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Number of tickets available in this tier",
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateEventDto {
  @ApiProperty({
    description: "Title of the event",
    example: "Summer Music Festival 2025",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Detailed description of the event",
    example:
      "Join us for the biggest music festival of the year featuring top artists...",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Start date and time of the event",
    example: "2025-07-01T18:00:00Z",
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: "End date and time of the event",
    example: "2025-07-03T23:00:00Z",
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: "Physical location where the event will take place",
    example: "Central Park, New York",
  })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiProperty({
    description: "Venue address",
    example: "59th St. to 110th St., New York, NY 10022",
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: "Category or type of event",
    example: "music-festival",
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: "Status of the event",
    enum: EventStatus,
    default: EventStatus.DRAFT,
    example: EventStatus.DRAFT,
  })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiProperty({
    description: "Maximum capacity for the event",
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: "Array of ticket tiers available for the event",
    type: [TicketTier],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTier)
  ticketTiers: TicketTier[];

  @ApiProperty({
    description: "Array of performer or artist IDs",
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  performers?: string[];

  @ApiProperty({
    description: "Array of sponsor IDs",
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sponsors?: string[];

  @ApiProperty({
    description: "Array of special guest IDs",
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialGuests?: string[];

  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Cover image file for the event",
    required: false,
  })
  @IsOptional()
  coverImage?: Express.Multer.File;
}
