import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EventStatus } from '../entities/event.entity';

export enum SortBy {
  START_DATE       = 'startDate',
  CREATED_AT       = 'createdAt',
  MIN_TICKET_PRICE = 'minTicketPrice',
  TITLE            = 'title',
}

export enum SortOrder {
  ASC  = 'ASC',
  DESC = 'DESC',
}

export class EventQueryDto {
  @ApiPropertyOptional({ description: 'Full-text search on title and description' })
  @IsString() @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus) @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code' })
  @IsString() @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVirtual?: boolean;

  @ApiPropertyOptional({ description: 'ISO date string — events starting on or after' })
  @IsDateString() @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date string — events starting on or before' })
  @IsDateString() @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsNumber() @IsOptional()
  @Type(() => Number)
  minTicketPrice?: number;

  @ApiPropertyOptional()
  @IsNumber() @IsOptional()
  @Type(() => Number)
  maxTicketPrice?: number;

  @ApiPropertyOptional({ description: 'Comma-separated tag list', example: 'music,outdoor' })
  @IsString() @IsOptional()
  tags?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsInt() @Min(1) @Max(100) @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.START_DATE })
  @IsEnum(SortBy) @IsOptional()
  sortBy?: SortBy = SortBy.START_DATE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsEnum(SortOrder) @IsOptional()
  sortOrder?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({
    description: 'ADMIN only — bypasses isArchived=false and status!=CANCELLED filters',
  })
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAll?: boolean;
}