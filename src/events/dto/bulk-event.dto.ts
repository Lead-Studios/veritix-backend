import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
  IsArray,
  Min,
  Max,
  Length,
  Matches,
  IsBoolean,
} from 'class-validator';
import { EventStatus } from '../../enums/event-status.enum';

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Tech Conference 2026', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({
    example: 'Annual technology conference',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-06-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ example: '2026-06-14T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  eventClosingDate?: string;

  @ApiPropertyOptional({ example: 500, minimum: 1, maximum: 1000000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Eko Convention Center' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  venue?: string;

  @ApiPropertyOptional({ example: 'Plot 123, Victoria Island' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({
    example: 'NG',
    description: 'ISO 2-letter country code',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['tech', 'conference'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123456789' })
  @IsOptional()
  @IsUrl()
  streamingUrl?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  minTicketPrice?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  maxTicketPrice?: number;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'ISO 3-letter currency code',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
