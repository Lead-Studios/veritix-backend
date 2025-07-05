import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  DATE = 'startDate',
  NAME = 'conferenceName',
}

export class SearchConferenceDto {
  @ApiProperty({ description: 'Search query term', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  query?: string;

  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  category?: string;

  @ApiProperty({
    description: 'Filter by location (country, state, or city)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  location?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Sort by field', required: false, enum: SortBy })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.RELEVANCE;

  @ApiProperty({ description: 'Sort order', required: false, enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
