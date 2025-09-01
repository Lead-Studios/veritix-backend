import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { UserBehaviorTrackingService } from '../services/user-behavior-tracking.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetRecommendationsDto, TrackInteractionDto, UpdatePreferencesDto } from '../dto/recommendations.dto';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recommendationEngine: jest.Mocked<RecommendationEngineService>;
  let behaviorTracking: jest.Mocked<UserBehaviorTrackingService>;
  let analytics: jest.Mocked<RecommendationAnalyticsService>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser };

  const mockRecommendations = [
    {
      eventId: 'event-123',
      score: 0.95,
      confidence: 0.9,
      reasons: ['category_match', 'location_proximity'],
      event: {
        id: 'event-123',
        title: 'Tech Conference 2024',
        category: 'Technology',
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationEngineService,
          useValue: {
            generateRecommendations: jest.fn(),
            getPersonalizedRecommendations: jest.fn(),
            getSimilarEvents: jest.fn(),
            getTrendingEvents: jest.fn(),
          },
        },
        {
          provide: UserBehaviorTrackingService,
          useValue: {
            trackInteraction: jest.fn(),
            getUserInteractions: jest.fn(),
            updateUserPreferences: jest.fn(),
            getUserPreferences: jest.fn(),
            getInteractionStats: jest.fn(),
          },
        },
        {
          provide: RecommendationAnalyticsService,
          useValue: {
            trackRecommendationView: jest.fn(),
            trackRecommendationClick: jest.fn(),
            getRecommendationMetrics: jest.fn(),
            getUserEngagementMetrics: jest.fn(),
            getPerformanceAnalytics: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    recommendationEngine = module.get(RecommendationEngineService);
    behaviorTracking = module.get(UserBehaviorTrackingService);
    analytics = module.get(RecommendationAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const dto: GetRecommendationsDto = {
        limit: 10,
        category: 'Technology',
        location: 'San Francisco',
      };

      recommendationEngine.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);
      analytics.trackRecommendationView.mockResolvedValue(undefined);

      const result = await controller.getRecommendations(mockRequest as any, dto);

      expect(result).toEqual({
        recommendations: mockRecommendations,
        total: 1,
        limit: 10,
        userId: 'user-123',
      });
      expect(recommendationEngine.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
      expect(analytics.trackRecommendationView).toHaveBeenCalledWith(
        'user-123',
        mockRecommendations.map(r => r.eventId),
      );
    });

    it('should handle empty recommendations', async () => {
      const dto: GetRecommendationsDto = { limit: 10 };

      recommendationEngine.getPersonalizedRecommendations.mockResolvedValue([]);

      const result = await controller.getRecommendations(mockRequest as any, dto);

      expect(result).toEqual({
        recommendations: [],
        total: 0,
        limit: 10,
        userId: 'user-123',
      });
    });
  });

  describe('getSimilarEvents', () => {
    it('should return similar events', async () => {
      recommendationEngine.getSimilarEvents.mockResolvedValue(mockRecommendations);

      const result = await controller.getSimilarEvents('event-123', { limit: 5 });

      expect(result).toEqual({
        similarEvents: mockRecommendations,
        total: 1,
        eventId: 'event-123',
      });
      expect(recommendationEngine.getSimilarEvents).toHaveBeenCalledWith(
        'event-123',
        { limit: 5 },
      );
    });
  });

  describe('getTrendingEvents', () => {
    it('should return trending events', async () => {
      recommendationEngine.getTrendingEvents.mockResolvedValue(mockRecommendations);

      const result = await controller.getTrendingEvents({ limit: 10 });

      expect(result).toEqual({
        trendingEvents: mockRecommendations,
        total: 1,
      });
      expect(recommendationEngine.getTrendingEvents).toHaveBeenCalledWith({ limit: 10 });
    });
  });

  describe('trackInteraction', () => {
    it('should track user interaction', async () => {
      const dto: TrackInteractionDto = {
        eventId: 'event-123',
        interactionType: 'click',
        metadata: { source: 'recommendations' },
      };

      const mockInteraction = {
        id: 'interaction-123',
        userId: 'user-123',
        ...dto,
        createdAt: new Date(),
      };

      behaviorTracking.trackInteraction.mockResolvedValue(mockInteraction as any);
      analytics.trackRecommendationClick.mockResolvedValue(undefined);

      const result = await controller.trackInteraction(mockRequest as any, dto);

      expect(result).toEqual({
        success: true,
        interactionId: 'interaction-123',
      });
      expect(behaviorTracking.trackInteraction).toHaveBeenCalledWith(
        'user-123',
        'event-123',
        'click',
        { source: 'recommendations' },
      );
      expect(analytics.trackRecommendationClick).toHaveBeenCalledWith(
        'user-123',
        'event-123',
      );
    });

    it('should handle interaction tracking errors', async () => {
      const dto: TrackInteractionDto = {
        eventId: 'event-123',
        interactionType: 'click',
      };

      behaviorTracking.trackInteraction.mockRejectedValue(new Error('Tracking failed'));

      await expect(controller.trackInteraction(mockRequest as any, dto))
        .rejects.toThrow('Tracking failed');
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const dto: UpdatePreferencesDto = {
        preferences: [
          {
            preferenceType: 'categories',
            preferenceValue: ['Technology', 'Music'],
            weight: 0.8,
          },
        ],
      };

      behaviorTracking.updateUserPreferences.mockResolvedValue(undefined);

      const result = await controller.updatePreferences(mockRequest as any, dto);

      expect(result).toEqual({
        success: true,
        message: 'Preferences updated successfully',
      });
      expect(behaviorTracking.updateUserPreferences).toHaveBeenCalledWith(
        'user-123',
        dto.preferences,
      );
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockPreferences = [
        {
          id: 'pref-123',
          userId: 'user-123',
          preferenceType: 'categories',
          preferenceValue: ['Technology'],
          weight: 0.8,
          confidence: 0.9,
        },
      ];

      behaviorTracking.getUserPreferences.mockResolvedValue(mockPreferences as any);

      const result = await controller.getUserPreferences(mockRequest as any);

      expect(result).toEqual({
        preferences: mockPreferences,
        userId: 'user-123',
      });
    });
  });

  describe('getInteractionHistory', () => {
    it('should return user interaction history', async () => {
      const mockInteractions = [
        {
          id: 'interaction-123',
          userId: 'user-123',
          eventId: 'event-123',
          interactionType: 'click',
          createdAt: new Date(),
        },
      ];

      behaviorTracking.getUserInteractions.mockResolvedValue(mockInteractions as any);

      const result = await controller.getInteractionHistory(mockRequest as any, { limit: 50 });

      expect(result).toEqual({
        interactions: mockInteractions,
        total: 1,
        userId: 'user-123',
      });
      expect(behaviorTracking.getUserInteractions).toHaveBeenCalledWith('user-123', 50);
    });
  });

  describe('getRecommendationMetrics', () => {
    it('should return recommendation metrics', async () => {
      const mockMetrics = {
        totalRecommendations: 100,
        clickThroughRate: 0.15,
        conversionRate: 0.05,
        avgRelevanceScore: 0.82,
      };

      analytics.getRecommendationMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getRecommendationMetrics(mockRequest as any);

      expect(result).toEqual(mockMetrics);
      expect(analytics.getRecommendationMetrics).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getEngagementMetrics', () => {
    it('should return user engagement metrics', async () => {
      const mockMetrics = {
        totalInteractions: 50,
        uniqueEventsViewed: 25,
        avgSessionDuration: 300,
        preferredCategories: ['Technology', 'Music'],
      };

      analytics.getUserEngagementMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getEngagementMetrics(mockRequest as any);

      expect(result).toEqual(mockMetrics);
      expect(analytics.getUserEngagementMetrics).toHaveBeenCalledWith('user-123');
    });
  });
});
