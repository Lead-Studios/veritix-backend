import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationStatus } from '../entities/recommendation.entity';

export class RecommendationItemDto {
  @ApiProperty({ description: 'Recommendation ID' })
  id: string;

  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event details' })
  event: {
    id: string;
    name: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
    category: string;
    imageUrl?: string;
    price?: number;
    availableTickets?: number;
  };

  @ApiProperty({ description: 'Recommendation score (0-1)' })
  score: number;

  @ApiProperty({ description: 'Recommendation confidence (0-1)' })
  confidence: number;

  @ApiPropertyOptional({ description: 'Explanation for the recommendation' })
  explanation?: string;

  @ApiPropertyOptional({ description: 'Reasons for recommendation' })
  reasons?: string[];

  @ApiProperty({ description: 'Recommendation status', enum: RecommendationStatus })
  status: RecommendationStatus;

  @ApiProperty({ description: 'Algorithm used for recommendation' })
  algorithm: string;

  @ApiPropertyOptional({ description: 'A/B test group' })
  abTestGroup?: string;

  @ApiProperty({ description: 'Recommendation timestamp' })
  createdAt: Date;
}

export class RecommendationsResponseDto {
  @ApiProperty({ description: 'List of recommendations', type: [RecommendationItemDto] })
  recommendations: RecommendationItemDto[];

  @ApiProperty({ description: 'Total number of available recommendations' })
  total: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Whether there are more recommendations available' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'A/B test experiment information' })
  experiment?: {
    id: string;
    name: string;
    variant: string;
  };

  @ApiPropertyOptional({ description: 'Recommendation metadata' })
  metadata?: {
    algorithm: string;
    modelVersion?: string;
    processingTime: number;
    diversityScore?: number;
  };
}

export class UserPreferencesResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User preferences by type' })
  preferences: Record<string, {
    value: any;
    weight: number;
    confidence: number;
    lastUpdated: Date;
  }>;

  @ApiProperty({ description: 'Preference summary' })
  summary: {
    topCategories: string[];
    preferredLocations: string[];
    priceRange: { min: number; max: number };
    preferredTimes: string[];
  };

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}

export class RecommendationStatsDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Total recommendations generated' })
  totalRecommendations: number;

  @ApiProperty({ description: 'Recommendations clicked' })
  clickedRecommendations: number;

  @ApiProperty({ description: 'Click-through rate' })
  clickThroughRate: number;

  @ApiProperty({ description: 'Recommendations converted to purchases' })
  convertedRecommendations: number;

  @ApiProperty({ description: 'Conversion rate' })
  conversionRate: number;

  @ApiProperty({ description: 'Average recommendation score' })
  averageScore: number;

  @ApiProperty({ description: 'Most recommended categories' })
  topCategories: Array<{
    category: string;
    count: number;
    clickRate: number;
  }>;

  @ApiProperty({ description: 'Algorithm performance breakdown' })
  algorithmPerformance: Record<string, {
    recommendations: number;
    clicks: number;
    conversions: number;
    averageScore: number;
  }>;
}

export class InteractionResponseDto {
  @ApiProperty({ description: 'Interaction ID' })
  id: string;

  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiPropertyOptional({ description: 'Updated user preferences' })
  updatedPreferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Recommended actions' })
  suggestedActions?: Array<{
    action: string;
    description: string;
    eventId?: string;
  }>;
}
