import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationEngineService } from './recommendation-engine.service';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationModel } from '../entities/recommendation-model.entity';
import { Event } from '../../events/entities/event.entity';
import { CollaborativeFilteringService } from './collaborative-filtering.service';
import { ContentBasedFilteringService } from './content-based-filtering.service';
import { MLTrainingService } from './ml-training.service';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let modelRepository: jest.Mocked<Repository<RecommendationModel>>;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let collaborativeService: jest.Mocked<CollaborativeFilteringService>;
  let contentBasedService: jest.Mocked<ContentBasedFilteringService>;
  let mlTrainingService: jest.Mocked<MLTrainingService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockEvent = {
    id: 'event-123',
    name: 'Test Event',
    description: 'Test Description',
    location: 'Test Location',
    state: 'CA',
    category: 'Technology',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-15'),
    ticketPrice: 100,
    ticketQuantity: 50,
  };

  const mockRecommendation = {
    id: 'rec-123',
    userId: 'user-123',
    eventId: 'event-123',
    score: 0.85,
    confidence: 0.9,
    reasons: ['category_match'],
    status: 'active',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationEngineService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RecommendationModel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CollaborativeFilteringService,
          useValue: {
            getRecommendations: jest.fn(),
          },
        },
        {
          provide: ContentBasedFilteringService,
          useValue: {
            getRecommendations: jest.fn(),
          },
        },
        {
          provide: MLTrainingService,
          useValue: {
            getActiveModel: jest.fn(),
            predict: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationEngineService>(RecommendationEngineService);
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    modelRepository = module.get(getRepositoryToken(RecommendationModel));
    eventRepository = module.get(getRepositoryToken(Event));
    collaborativeService = module.get(CollaborativeFilteringService);
    contentBasedService = module.get(ContentBasedFilteringService);
    mlTrainingService = module.get(MLTrainingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const mockModel = {
        id: 'model-123',
        modelType: 'hybrid',
        status: 'active',
      };

      mlTrainingService.getActiveModel.mockResolvedValue(mockModel as any);
      mlTrainingService.predict.mockResolvedValue([
        { eventId: 'event-123', score: 0.85 },
      ]);
      eventRepository.find.mockResolvedValue([mockEvent] as any);

      const result = await service.getRecommendations({
        userId: 'user-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mlTrainingService.getActiveModel).toHaveBeenCalled();
    });

    it('should handle no active models gracefully', async () => {
      mlTrainingService.getActiveModel.mockResolvedValue(null);
      collaborativeService.getRecommendations.mockResolvedValue([
        { eventId: 'event-123', score: 0.75 },
      ]);
      eventRepository.find.mockResolvedValue([mockEvent] as any);

      const result = await service.getRecommendations({
        userId: 'user-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(collaborativeService.getRecommendations).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      mlTrainingService.getActiveModel.mockResolvedValue(null);
      collaborativeService.getRecommendations.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);

      await service.getRecommendations({
        userId: 'user-123',
        limit: 10,
        filters: { category: 'Technology' },
      });

      expect(eventRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Technology',
          }),
        })
      );
    });
  });

  describe('getPersonalizedHomepageRecommendations', () => {
    it('should return homepage recommendations', async () => {
      jest.spyOn(service, 'getRecommendations').mockResolvedValue([
        {
          eventId: 'event-123',
          score: 0.85,
          confidence: 0.9,
          reasons: ['category_match'],
          rank: 1,
        },
      ] as any);

      const result = await service.getPersonalizedHomepageRecommendations('user-123');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(service.getRecommendations).toHaveBeenCalledWith({
        userId: 'user-123',
        limit: 6,
        context: 'homepage',
        includeExplanations: true,
      });
    });
  });

  describe('getSimilarEventRecommendations', () => {
    it('should return similar event recommendations', async () => {
      eventRepository.findOne.mockResolvedValue(mockEvent as any);
      jest.spyOn(service, 'getRecommendations').mockResolvedValue([
        {
          eventId: 'event-456',
          score: 0.75,
          confidence: 0.8,
          reasons: ['similar_category'],
          rank: 1,
        },
      ] as any);

      const result = await service.getSimilarEventRecommendations('user-123', 'event-123');

      expect(result).toBeDefined();
      expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: 'event-123' } });
      expect(service.getRecommendations).toHaveBeenCalledWith({
        userId: 'user-123',
        limit: 8,
        context: 'similar_events',
        filters: { location: 'CA' },
        excludeEventIds: ['event-123'],
      });
    });

    it('should return empty array for non-existent event', async () => {
      eventRepository.findOne.mockResolvedValue(null);

      const result = await service.getSimilarEventRecommendations('user-123', 'non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryRecommendations', () => {
    it('should return category-based recommendations', async () => {
      jest.spyOn(service, 'getRecommendations').mockResolvedValue([
        {
          eventId: 'event-123',
          score: 0.8,
          confidence: 0.85,
          reasons: ['category_match'],
          rank: 1,
        },
      ] as any);

      const result = await service.getCategoryRecommendations('user-123', 'Technology');

      expect(result).toBeDefined();
      expect(service.getRecommendations).toHaveBeenCalledWith({
        userId: 'user-123',
        limit: 12,
        context: 'category_browse',
        filters: { category: 'Technology' },
      });
    });
  });

  describe('getTrendingRecommendations', () => {
    it('should return trending recommendations', async () => {
      eventRepository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { event_id: 'event-123', interaction_count: 10 },
        ]),
      });

      eventRepository.find.mockResolvedValue([mockEvent] as any);

      const result = await service.getTrendingRecommendations('user-123');

      expect(result).toBeDefined();
      expect(eventRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getLocationBasedRecommendations', () => {
    it('should return location-based recommendations', async () => {
      eventRepository.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { 
            event_id: 'event-123',
            event_name: 'Test Event',
            distance: 5.2,
          },
        ]),
      });

      const result = await service.getLocationBasedRecommendations(
        'user-123',
        37.7749,
        -122.4194,
      );

      expect(result).toBeDefined();
      expect(eventRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mlTrainingService.getActiveModel.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getRecommendations({ userId: 'user-123' })
      ).rejects.toThrow('Database error');
    });

    it('should handle missing user data', async () => {
      mlTrainingService.getActiveModel.mockResolvedValue(null);
      collaborativeService.getRecommendations.mockResolvedValue([]);
      contentBasedService.getRecommendations.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);

      const result = await service.getRecommendations({
        userId: 'non-existent-user',
      });

      expect(result).toEqual([]);
    });
  });
});
