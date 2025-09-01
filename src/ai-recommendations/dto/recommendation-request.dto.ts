import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RecommendationType {
  HOMEPAGE = 'homepage',
  SIMILAR = 'similar',
  CATEGORY = 'category',
  TRENDING = 'trending',
  LOCATION = 'location',
  PERSONALIZED = 'personalized',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  DATE = 'date',
  POPULARITY = 'popularity',
  PRICE = 'price',
  DISTANCE = 'distance',
}

export class GetRecommendationsDto {
  @ApiProperty({
    description: 'Type of recommendations to retrieve',
    enum: RecommendationType,
  })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiPropertyOptional({
    description: 'Number of recommendations to return',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Event ID for similar recommendations',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Category for category-based recommendations',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Location for location-based recommendations',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Latitude for location-based recommendations',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location-based recommendations',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance in kilometers for location-based recommendations',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  maxDistance?: number = 50;

  @ApiPropertyOptional({
    description: 'Price range filter - minimum price',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Price range filter - maximum price',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Date range filter - start date',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date range filter - end date',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Event categories to include',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Event categories to exclude',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeCategories?: string[];

  @ApiPropertyOptional({
    description: 'Sort order for recommendations',
    enum: SortBy,
    default: SortBy.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Include explanation for recommendations',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeExplanation?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include diversity in recommendations',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDiversity?: boolean = true;

  @ApiPropertyOptional({
    description: 'A/B test experiment ID',
  })
  @IsOptional()
  @IsString()
  experimentId?: string;
}

export class TrackInteractionDto {
  @ApiProperty({
    description: 'Event ID that was interacted with',
  })
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Type of interaction',
    enum: ['view', 'click', 'share', 'save', 'purchase', 'like', 'comment'],
  })
  @IsString()
  interactionType: string;

  @ApiPropertyOptional({
    description: 'Recommendation ID if interaction came from a recommendation',
  })
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @ApiPropertyOptional({
    description: 'Additional context for the interaction',
  })
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Device information',
  })
  @IsOptional()
  deviceInfo?: Record<string, any>;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Event categories preferences',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Location preferences',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Price range preference - minimum',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Price range preference - maximum',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Preferred event times',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTimes?: string[];

  @ApiPropertyOptional({
    description: 'Additional preference metadata',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
