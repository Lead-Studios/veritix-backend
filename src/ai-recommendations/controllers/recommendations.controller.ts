import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { UserBehaviorTrackingService } from '../services/user-behavior-tracking.service';
import { ABTestingService } from '../services/ab-testing.service';
import {
  GetRecommendationsDto,
  TrackInteractionDto,
  UpdatePreferencesDto,
} from '../dto/recommendation-request.dto';
import {
  RecommendationsResponseDto,
  UserPreferencesResponseDto,
  RecommendationStatsDto,
  InteractionResponseDto,
} from '../dto/recommendation-response.dto';

@ApiTags('AI Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly behaviorTracking: UserBehaviorTrackingService,
    private readonly abTesting: ABTestingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized event recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  async getRecommendations(
    @Query() query: GetRecommendationsDto,
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.id;

    try {
      // Handle A/B testing
      let experimentVariant: string | undefined;
      if (query.experimentId) {
        experimentVariant = await this.abTesting.assignUserToVariant(userId, query.experimentId);
        const variantConfig = await this.abTesting.getVariantConfig(query.experimentId, experimentVariant);
        
        // Apply variant configuration to query
        Object.assign(query, variantConfig);
      }

      // Get recommendations based on type
      let recommendations;
      switch (query.type) {
        case 'homepage':
          const homepageRecs = await this.recommendationEngine.getPersonalizedHomepageRecommendations(userId);
          recommendations = {
            recommendations: homepageRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: homepageRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
          break;

        case 'similar':
          if (!query.eventId) {
            throw new HttpException('Event ID is required for similar recommendations', HttpStatus.BAD_REQUEST);
          }
          const similarRecs = await this.recommendationEngine.getSimilarEventRecommendations(userId, query.eventId);
          recommendations = {
            recommendations: similarRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: similarRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
          break;

        case 'category':
          if (!query.category) {
            throw new HttpException('Category is required for category recommendations', HttpStatus.BAD_REQUEST);
          }
          const categoryRecs = await this.recommendationEngine.getCategoryRecommendations(userId, query.category);
          recommendations = {
            recommendations: categoryRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: categoryRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
          break;

        case 'trending':
          const trendingRecs = await this.recommendationEngine.getTrendingRecommendations(userId);
          recommendations = {
            recommendations: trendingRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: trendingRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
          break;

        case 'location':
          if (!query.latitude || !query.longitude) {
            throw new HttpException('Latitude and longitude are required for location recommendations', HttpStatus.BAD_REQUEST);
          }
          const locationRecs = await this.recommendationEngine.getLocationBasedRecommendations(
            userId,
            query.latitude,
            query.longitude,
          );
          recommendations = {
            recommendations: locationRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: locationRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
          break;

        default:
          const defaultRecs = await this.recommendationEngine.getPersonalizedHomepageRecommendations(userId);
          recommendations = {
            recommendations: defaultRecs.map(rec => this.mapToRecommendationItem(rec)),
            total: defaultRecs.length,
            offset: query.offset || 0,
            limit: query.limit || 10,
            hasMore: false,
          };
      }

      // Record A/B test metrics if applicable
      if (query.experimentId && experimentVariant) {
        await this.abTesting.recordExperimentMetric(
          query.experimentId,
          experimentVariant,
          'impressions' as any,
          recommendations.recommendations.length,
          { userId, type: query.type },
        );
      }

      // Track recommendation views
      for (const rec of recommendations.recommendations) {
        await this.behaviorTracking.trackInteraction(
          userId,
          rec.eventId,
          'recommendation_view',
          {
            recommendationId: rec.id,
            algorithm: rec.algorithm,
            score: rec.score,
            abTestGroup: experimentVariant,
          },
        );
      }

      return {
        ...recommendations,
        experiment: query.experimentId && experimentVariant ? {
          id: query.experimentId,
          name: 'Recommendation Algorithm Test',
          variant: experimentVariant,
        } : undefined,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('interaction')
  @ApiOperation({ summary: 'Track user interaction with recommended event' })
  @ApiResponse({
    status: 201,
    description: 'Interaction tracked successfully',
    type: InteractionResponseDto,
  })
  async trackInteraction(
    @Body() trackInteractionDto: TrackInteractionDto,
    @Request() req: any,
  ): Promise<InteractionResponseDto> {
    const userId = req.user.id;

    try {
      const interaction = await this.behaviorTracking.trackInteraction(
        userId,
        trackInteractionDto.eventId,
        trackInteractionDto.interactionType,
        {
          recommendationId: trackInteractionDto.recommendationId,
          ...trackInteractionDto.context,
        },
      );

      // Update recommendation status if applicable
      if (trackInteractionDto.recommendationId) {
        // Note: updateRecommendationStatus method needs to be implemented in RecommendationEngineService
        // For now, we'll track this through the interaction itself
      }

      // Get updated preferences
      const updatedPreferences = await this.behaviorTracking.getUserPreferences(userId);

      // Generate suggested actions based on interaction
      const suggestedActions = await this.generateSuggestedActions(
        userId,
        trackInteractionDto.eventId,
        trackInteractionDto.interactionType,
      );

      return {
        id: interaction.id,
        success: true,
        message: 'Interaction tracked successfully',
        updatedPreferences: updatedPreferences.reduce((acc, pref) => {
          acc[pref.preferenceType] = {
            value: pref.preferenceValue,
            weight: pref.weight,
            confidence: pref.confidence,
          };
          return acc;
        }, {}),
        suggestedActions,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to track interaction: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences and recommendation settings' })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved successfully',
    type: UserPreferencesResponseDto,
  })
  async getUserPreferences(@Request() req: any): Promise<UserPreferencesResponseDto> {
    const userId = req.user.id;

    try {
      const preferences = await this.behaviorTracking.getUserPreferences(userId);
      
      const preferencesMap = preferences.reduce((acc, pref) => {
        acc[pref.preferenceType] = {
          value: pref.preferenceValue,
          weight: pref.weight,
          confidence: pref.confidence,
          lastUpdated: pref.updatedAt,
        };
        return acc;
      }, {});

      // Generate preference summary
      const summary = this.generatePreferenceSummary(preferences);

      return {
        userId,
        preferences: preferencesMap,
        summary,
        lastUpdated: preferences.length > 0 
          ? new Date(Math.max(...preferences.map(p => p.updatedAt.getTime())))
          : new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences manually' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: UserPreferencesResponseDto,
  })
  async updateUserPreferences(
    @Body() updatePreferencesDto: UpdatePreferencesDto,
    @Request() req: any,
  ): Promise<UserPreferencesResponseDto> {
    const userId = req.user.id;

    try {
      // Update each preference type using the correct method
      const preferences = [];
      
      if (updatePreferencesDto.categories) {
        preferences.push({
          preferenceType: 'categories',
          preferenceValue: updatePreferencesDto.categories,
          weight: 0.8,
        });
      }

      if (updatePreferencesDto.locations) {
        preferences.push({
          preferenceType: 'locations',
          preferenceValue: updatePreferencesDto.locations,
          weight: 0.8,
        });
      }

      if (updatePreferencesDto.minPrice !== undefined || updatePreferencesDto.maxPrice !== undefined) {
        preferences.push({
          preferenceType: 'price_range',
          preferenceValue: {
            min: updatePreferencesDto.minPrice,
            max: updatePreferencesDto.maxPrice,
          },
          weight: 0.8,
        });
      }

      if (updatePreferencesDto.eventTimes) {
        preferences.push({
          preferenceType: 'event_times',
          preferenceValue: updatePreferencesDto.eventTimes,
          weight: 0.8,
        });
      }

      if (updatePreferencesDto.metadata) {
        for (const [key, value] of Object.entries(updatePreferencesDto.metadata)) {
          preferences.push({
            preferenceType: key,
            preferenceValue: value,
            weight: 0.6,
          });
        }
      }

      // Update preferences using the available method
      for (const pref of preferences) {
        await this.behaviorTracking.updateUserPreferences(userId, [pref]);
      }

      // Return updated preferences
      return this.getUserPreferences(req);
    } catch (error) {
      throw new HttpException(
        `Failed to update preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user recommendation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Recommendation statistics retrieved successfully',
    type: RecommendationStatsDto,
  })
  async getRecommendationStats(@Request() req: any): Promise<RecommendationStatsDto> {
    const userId = req.user.id;

    try {
      // Get basic recommendation stats
      const recommendations = await this.recommendationEngine.getRecommendations({ userId, limit: 100 });
      const interactions = await this.behaviorTracking.getUserInteractions(userId, 100);
      
      const clickedRecs = interactions.filter(i => i.interactionType === 'click').length;
      const totalRecs = recommendations.length;
      
      const stats: RecommendationStatsDto = {
        userId,
        totalRecommendations: totalRecs,
        clickedRecommendations: clickedRecs,
        clickThroughRate: totalRecs > 0 ? clickedRecs / totalRecs : 0,
        convertedRecommendations: interactions.filter(i => i.interactionType === 'purchase').length,
        conversionRate: totalRecs > 0 ? interactions.filter(i => i.interactionType === 'purchase').length / totalRecs : 0,
        averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / totalRecs || 0,
        topCategories: [],
        algorithmPerformance: {},
      };
      
      return stats;
    } catch (error) {
      throw new HttpException(
        `Failed to get recommendation stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('similar/:eventId')
  @ApiOperation({ summary: 'Get similar event recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Similar recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  async getSimilarEvents(
    @Param('eventId') eventId: string,
    @Query('limit') limit: number = 10,
    @Query('includeExplanation') includeExplanation: boolean = false,
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.id;

    try {
      const similarRecs = await this.recommendationEngine.getSimilarEventRecommendations(userId, eventId);
      return {
        recommendations: similarRecs.map(rec => this.mapToRecommendationItem(rec)),
        total: similarRecs.length,
        offset: 0,
        limit,
        hasMore: false,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get similar events: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending event recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Trending recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  async getTrendingEvents(
    @Query('limit') limit: number = 10,
    @Query('location') location?: string,
    @Query('category') category?: string,
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.id;

    try {
      const trendingRecs = await this.recommendationEngine.getTrendingRecommendations(userId);
      return {
        recommendations: trendingRecs.map(rec => this.mapToRecommendationItem(rec)),
        total: trendingRecs.length,
        offset: 0,
        limit,
        hasMore: false,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get trending events: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get category-based recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Category recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  async getCategoryRecommendations(
    @Param('category') category: string,
    @Query('limit') limit: number = 10,
    @Query('includeExplanation') includeExplanation: boolean = false,
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.id;

    try {
      const categoryRecs = await this.recommendationEngine.getCategoryRecommendations(userId, category);
      return {
        recommendations: categoryRecs.map(rec => this.mapToRecommendationItem(rec)),
        total: categoryRecs.length,
        offset: 0,
        limit,
        hasMore: false,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get category recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('location')
  @ApiOperation({ summary: 'Get location-based recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Location recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  async getLocationRecommendations(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('maxDistance') maxDistance: number = 50,
    @Query('limit') limit: number = 10,
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.id;

    if (!latitude || !longitude) {
      throw new HttpException('Latitude and longitude are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const locationRecs = await this.recommendationEngine.getLocationBasedRecommendations(
        userId,
        latitude,
        longitude,
      );
      return {
        recommendations: locationRecs.map(rec => this.mapToRecommendationItem(rec)),
        total: locationRecs.length,
        offset: 0,
        limit,
        hasMore: false,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get location recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh user recommendations' })
  @ApiResponse({
    status: 201,
    description: 'Recommendations refreshed successfully',
  })
  async refreshRecommendations(@Request() req: any): Promise<{ message: string; count: number }> {
    const userId = req.user.id;

    try {
      // Generate fresh recommendations
      const freshRecs = await this.recommendationEngine.getRecommendations({ userId, limit: 20 });
      const count = freshRecs.length;
      return {
        message: 'Recommendations refreshed successfully',
        count,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to refresh recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Provide feedback on recommendation quality' })
  @ApiResponse({
    status: 201,
    description: 'Feedback recorded successfully',
  })
  async provideFeedback(
    @Body() body: { recommendationId: string; rating: number; feedback?: string },
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;

    if (body.rating < 1 || body.rating > 5) {
      throw new HttpException('Rating must be between 1 and 5', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.behaviorTracking.trackInteraction(
        userId,
        '', // No specific event for feedback
        'feedback',
        {
          recommendationId: body.recommendationId,
          rating: body.rating,
          feedback: body.feedback,
        },
      );

      return { message: 'Feedback recorded successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to record feedback: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async generateSuggestedActions(
    userId: string,
    eventId: string,
    interactionType: string,
  ): Promise<Array<{ action: string; description: string; eventId?: string }>> {
    const actions = [];

    switch (interactionType) {
      case 'view':
        actions.push({
          action: 'get_similar',
          description: 'View similar events',
          eventId,
        });
        break;
      case 'click':
        actions.push({
          action: 'purchase_ticket',
          description: 'Purchase tickets for this event',
          eventId,
        });
        actions.push({
          action: 'save_event',
          description: 'Save event to favorites',
          eventId,
        });
        break;
      case 'save':
        actions.push({
          action: 'share_event',
          description: 'Share this event with friends',
          eventId,
        });
        break;
    }

    return actions;
  }

  private mapToRecommendationItem(rec: any): any {
    return {
      id: rec.id || Math.random().toString(36),
      eventId: rec.eventId,
      event: rec.event ? {
        id: rec.event.id,
        name: rec.event.name,
        description: rec.event.description,
        location: rec.event.location,
        startDate: rec.event.startDate,
        endDate: rec.event.endDate,
        category: rec.event.category,
        imageUrl: rec.event.imageUrl,
        price: rec.event.ticketPrice,
        availableTickets: rec.event.ticketQuantity,
      } : null,
      score: rec.score,
      confidence: rec.confidence,
      explanation: rec.explanation,
      reasons: rec.reasons || [],
      status: 'active',
      algorithm: 'hybrid',
      abTestGroup: rec.abTestGroup,
      createdAt: new Date(),
    };
  }

  private generatePreferenceSummary(preferences: any[]): any {
    const categoryPrefs = preferences.filter(p => p.preferenceType === 'categories');
    const locationPrefs = preferences.filter(p => p.preferenceType === 'locations');
    const pricePrefs = preferences.filter(p => p.preferenceType === 'price_range');
    const timePrefs = preferences.filter(p => p.preferenceType === 'event_times');

    return {
      topCategories: categoryPrefs
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map(p => p.preferenceValue)
        .flat(),
      preferredLocations: locationPrefs
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map(p => p.preferenceValue)
        .flat(),
      priceRange: pricePrefs.length > 0 ? pricePrefs[0].preferenceValue : { min: 0, max: 1000 },
      preferredTimes: timePrefs
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map(p => p.preferenceValue)
        .flat(),
    };
  }
}
