import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateEventDto {
  @ApiProperty({ example: 'Tech Conference 2026' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ example: 'Annual technology conference' })
  @IsString()
  @Length(1, 2000)
  description: string;

  @ApiProperty({ example: '2026-06-15T10:00:00Z' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({ example: '2026-06-14T23:59:59Z' })
  @IsDateString()
  eventClosingDate: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  capacity: number;

  @ApiPropertyOptional({ example: 'Eko Convention Center' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: ['tech', 'conference'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;
}
