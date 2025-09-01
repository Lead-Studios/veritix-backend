import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationAnalyticsController } from './recommendation-analytics.controller';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('RecommendationAnalyticsController', () => {
  let controller: RecommendationAnalyticsController;
  let analyticsService: jest.Mocked<RecommendationAnalyticsService>;

  const mockAnalytics = {
    totalRecommendations: 1000,
    totalClicks: 150,
    totalConversions: 25,
    clickThroughRate: 0.15,
    conversionRate: 0.025,
    avgRelevanceScore: 0.82,
    topCategories: [
      { category: 'Technology', count: 300 },
      { category: 'Music', count: 250 },
    ],
    performanceByTimeframe: {
      daily: { ctr: 0.16, cvr: 0.03 },
      weekly: { ctr: 0.15, cvr: 0.025 },
      monthly: { ctr: 0.14, cvr: 0.02 },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationAnalyticsController],
      providers: [
        {
          provide: RecommendationAnalyticsService,
          useValue: {
            getGlobalAnalytics: jest.fn(),
            getPerformanceAnalytics: jest.fn(),
            getCategoryAnalytics: jest.fn(),
            getUserSegmentAnalytics: jest.fn(),
            getRecommendationEffectiveness: jest.fn(),
            getABTestResults: jest.fn(),
            exportAnalyticsData: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RecommendationAnalyticsController>(RecommendationAnalyticsController);
    analyticsService = module.get(RecommendationAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGlobalAnalytics', () => {
    it('should return global analytics', async () => {
      analyticsService.getGlobalAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getGlobalAnalytics({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual(mockAnalytics);
      expect(analyticsService.getGlobalAnalytics).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should handle analytics service errors', async () => {
      analyticsService.getGlobalAnalytics.mockRejectedValue(new Error('Analytics error'));

      await expect(controller.getGlobalAnalytics({}))
        .rejects.toThrow('Analytics error');
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return performance analytics', async () => {
      const mockPerformance = {
        modelAccuracy: 0.92,
        responseTime: 150,
        throughput: 1000,
        errorRate: 0.01,
        trends: {
          accuracy: [0.90, 0.91, 0.92],
          responseTime: [160, 155, 150],
        },
      };

      analyticsService.getPerformanceAnalytics.mockResolvedValue(mockPerformance);

      const result = await controller.getPerformanceAnalytics({
        timeframe: 'weekly',
      });

      expect(result).toEqual(mockPerformance);
      expect(analyticsService.getPerformanceAnalytics).toHaveBeenCalledWith({
        timeframe: 'weekly',
      });
    });
  });

  describe('getCategoryAnalytics', () => {
    it('should return category analytics', async () => {
      const mockCategoryAnalytics = {
        categories: [
          {
            category: 'Technology',
            totalRecommendations: 300,
            clickThroughRate: 0.18,
            conversionRate: 0.04,
            avgScore: 0.85,
          },
          {
            category: 'Music',
            totalRecommendations: 250,
            clickThroughRate: 0.12,
            conversionRate: 0.02,
            avgScore: 0.78,
          },
        ],
      };

      analyticsService.getCategoryAnalytics.mockResolvedValue(mockCategoryAnalytics);

      const result = await controller.getCategoryAnalytics({
        category: 'Technology',
      });

      expect(result).toEqual(mockCategoryAnalytics);
      expect(analyticsService.getCategoryAnalytics).toHaveBeenCalledWith({
        category: 'Technology',
      });
    });
  });

  describe('getUserSegmentAnalytics', () => {
    it('should return user segment analytics', async () => {
      const mockSegmentAnalytics = {
        segments: [
          {
            segment: 'high_engagement',
            userCount: 500,
            avgCTR: 0.20,
            avgCVR: 0.05,
            topCategories: ['Technology', 'Business'],
          },
          {
            segment: 'casual_users',
            userCount: 1500,
            avgCTR: 0.10,
            avgCVR: 0.015,
            topCategories: ['Entertainment', 'Sports'],
          },
        ],
      };

      analyticsService.getUserSegmentAnalytics.mockResolvedValue(mockSegmentAnalytics);

      const result = await controller.getUserSegmentAnalytics({
        segment: 'high_engagement',
      });

      expect(result).toEqual(mockSegmentAnalytics);
      expect(analyticsService.getUserSegmentAnalytics).toHaveBeenCalledWith({
        segment: 'high_engagement',
      });
    });
  });

  describe('getRecommendationEffectiveness', () => {
    it('should return recommendation effectiveness metrics', async () => {
      const mockEffectiveness = {
        overallEffectiveness: 0.78,
        byAlgorithm: {
          collaborative_filtering: 0.82,
          content_based: 0.75,
          hybrid: 0.85,
        },
        byTimeframe: {
          hourly: Array(24).fill(0).map((_, i) => ({ hour: i, effectiveness: 0.7 + Math.random() * 0.2 })),
          daily: Array(7).fill(0).map((_, i) => ({ day: i, effectiveness: 0.7 + Math.random() * 0.2 })),
        },
        improvementSuggestions: [
          'Increase weight for location-based recommendations',
          'Add more diverse content in Music category',
        ],
      };

      analyticsService.getRecommendationEffectiveness.mockResolvedValue(mockEffectiveness);

      const result = await controller.getRecommendationEffectiveness({
        algorithm: 'hybrid',
      });

      expect(result).toEqual(mockEffectiveness);
      expect(analyticsService.getRecommendationEffectiveness).toHaveBeenCalledWith({
        algorithm: 'hybrid',
      });
    });
  });

  describe('getABTestResults', () => {
    it('should return A/B test results', async () => {
      const mockABResults = {
        testId: 'test-123',
        testName: 'Algorithm Comparison',
        variants: [
          {
            name: 'control',
            userCount: 500,
            ctr: 0.12,
            cvr: 0.02,
            confidence: 0.95,
          },
          {
            name: 'treatment',
            userCount: 500,
            ctr: 0.18,
            cvr: 0.035,
            confidence: 0.98,
          },
        ],
        winner: 'treatment',
        statisticalSignificance: 0.99,
        recommendedAction: 'Deploy treatment variant to all users',
      };

      analyticsService.getABTestResults.mockResolvedValue(mockABResults);

      const result = await controller.getABTestResults('test-123');

      expect(result).toEqual(mockABResults);
      expect(analyticsService.getABTestResults).toHaveBeenCalledWith('test-123');
    });

    it('should handle non-existent test ID', async () => {
      analyticsService.getABTestResults.mockRejectedValue(new Error('Test not found'));

      await expect(controller.getABTestResults('invalid-test'))
        .rejects.toThrow('Test not found');
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export analytics data', async () => {
      const mockExportData = {
        exportId: 'export-123',
        downloadUrl: 'https://example.com/download/export-123.csv',
        format: 'csv',
        recordCount: 1000,
        generatedAt: new Date(),
      };

      analyticsService.exportAnalyticsData.mockResolvedValue(mockExportData);

      const result = await controller.exportAnalyticsData({
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeUserData: false,
      });

      expect(result).toEqual(mockExportData);
      expect(analyticsService.exportAnalyticsData).toHaveBeenCalledWith({
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeUserData: false,
      });
    });

    it('should handle export errors', async () => {
      analyticsService.exportAnalyticsData.mockRejectedValue(new Error('Export failed'));

      await expect(controller.exportAnalyticsData({ format: 'csv' }))
        .rejects.toThrow('Export failed');
    });
  });
});
