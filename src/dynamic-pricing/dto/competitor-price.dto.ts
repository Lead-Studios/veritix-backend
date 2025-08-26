import { IsString, IsNumber, IsDate, IsUrl, IsOptional, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CompetitorPriceDto {
  @ApiProperty({ description: 'Competitor name' })
  @IsString()
  competitorName: string;

  @ApiProperty({ description: 'Event name' })
  @IsString()
  eventName: string;

  @ApiProperty({ description: 'Event type (e.g., concert, conference, sports)' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Event location' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Ticket price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Ticket type (e.g., general, vip, early_bird)' })
  @IsString()
  ticketType: string;

  @ApiProperty({ description: 'Event capacity', minimum: 1 })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: 'Available tickets', minimum: 0 })
  @IsNumber()
  @Min(0)
  availableTickets: number;

  @ApiProperty({ description: 'Event date' })
  @IsDate()
  @Type(() => Date)
  eventDate: Date;

  @ApiProperty({ description: 'Source URL' })
  @IsUrl()
  sourceUrl: string;

  @ApiProperty({ description: 'Confidence level (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: {
    scrapingMethod?: string;
    dataQuality?: string;
    priceHistory?: Array<{
      price: number;
      timestamp: string;
    }>;
    additionalFees?: number;
    currency?: string;
  };
}
