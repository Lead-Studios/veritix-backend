import { IsString, IsNumber, IsDate, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePriceRecommendationDto {
  @ApiProperty({ description: 'Event ID' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Ticket tier ID', required: false })
  @IsOptional()
  @IsString()
  ticketTierId?: string;

  @ApiProperty({ description: 'Current ticket price', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentPrice: number;

  @ApiProperty({ description: 'Available inventory level', minimum: 0 })
  @IsNumber()
  @Min(0)
  inventoryLevel: number;

  @ApiProperty({ description: 'Total capacity', minimum: 1 })
  @IsNumber()
  @Min(1)
  totalCapacity: number;

  @ApiProperty({ description: 'Time to event in hours', minimum: 0 })
  @IsNumber()
  @Min(0)
  timeToEvent: number;

  @ApiProperty({ description: 'Event date' })
  @IsDate()
  @Type(() => Date)
  eventDate: Date;

  @ApiProperty({ description: 'Event type (e.g., concert, conference, sports)' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Event location' })
  @IsString()
  location: string;
}
