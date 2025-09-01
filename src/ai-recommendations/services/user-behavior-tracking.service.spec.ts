import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBehaviorTrackingService } from './user-behavior-tracking.service';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { UserPreference } from '../entities/user-preference.entity';

describe('UserBehaviorTrackingService', () => {
  let service: UserBehaviorTrackingService;
  let interactionRepository: jest.Mocked<Repository<UserInteraction>>;
  let preferenceRepository: jest.Mocked<Repository<UserPreference>>;

  const mockInteraction = {
    id: 'interaction-123',
    userId: 'user-123',
    eventId: 'event-123',
    interactionType: 'click',
    metadata: { source: 'homepage' },
    createdAt: new Date(),
  };

  const mockPreference = {
    id: 'pref-123',
    userId: 'user-123',
    preferenceType: 'categories',
    preferenceValue: ['Technology', 'Music'],
    weight: 0.8,
    confidence: 0.9,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBehaviorTrackingService,
        {
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPreference),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            upsert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserBehaviorTrackingService>(UserBehaviorTrackingService);
    interactionRepository = module.get(getRepositoryToken(UserInteraction));
    preferenceRepository = module.get(getRepositoryToken(UserPreference));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackInteraction', () => {
    it('should track user interaction successfully', async () => {
      interactionRepository.create.mockReturnValue(mockInteraction as any);
      interactionRepository.save.mockResolvedValue(mockInteraction as any);

      const result = await service.trackInteraction({
        userId: 'user-123',
        eventId: 'event-123',
        interactionType: InteractionType.CLICK,
        metadata: { source: 'homepage' },
      });

      expect(result).toEqual(mockInteraction);
      expect(interactionRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        eventId: 'event-123',
        interactionType: InteractionType.CLICK,
        metadata: { source: 'homepage' },
      });
      expect(interactionRepository.save).toHaveBeenCalled();
    });

    it('should handle interaction tracking errors', async () => {
      interactionRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.trackInteraction({
          userId: 'user-123',
          eventId: 'event-123',
          interactionType: InteractionType.CLICK,
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserInteractions', () => {
    it('should return user interactions with limit', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInteraction]),
      };
      interactionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getUserInteractions('user-123', 10);

      expect(result).toEqual([mockInteraction]);
      expect(interactionRepository.createQueryBuilder).toHaveBeenCalledWith('interaction');
    });

    it('should return empty array for user with no interactions', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      interactionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getUserInteractions('user-456', 10);

      expect(result).toEqual([]);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const interactionData = {
        userId: 'user-123',
        eventId: 'event-123',
        interactionType: 'click' as any,
        searchQuery: { category: 'Technology' },
      };

      preferenceRepository.findOne.mockResolvedValue(null);
      preferenceRepository.create.mockReturnValue(mockPreference as any);
      preferenceRepository.save.mockResolvedValue(mockPreference as any);

      await service.updateUserPreferences(interactionData);

      expect(preferenceRepository.save).toHaveBeenCalled();
    });

    it('should handle interaction without eventId', async () => {
      const interactionData = {
        userId: 'user-123',
        interactionType: 'click' as any,
      };

      await service.updateUserPreferences(interactionData);

      expect(preferenceRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      preferenceRepository.find.mockResolvedValue([mockPreference] as any);

      const result = await service.getUserPreferences('user-123');

      expect(result).toEqual([mockPreference]);
      expect(preferenceRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { weight: 'DESC' },
      });
    });

    it('should return empty array for user with no preferences', async () => {
      preferenceRepository.find.mockResolvedValue([]);

      const result = await service.getUserPreferences('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('getInteractionStats', () => {
    it('should return interaction statistics', async () => {
      const mockStats = [
        { type: 'click', count: '10', avgWeight: '2.0' },
        { type: 'view', count: '50', avgWeight: '1.0' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockStats),
      };
      interactionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getInteractionStats('user-123', 30);

      expect(result.totalInteractions).toBe(60);
      expect(result.interactionBreakdown).toEqual(mockStats);
    });
    });

    it('should handle users with no interactions', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      interactionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getInteractionStats('user-456', 30);

      expect(result.totalInteractions).toBe(0);
      expect(result.interactionBreakdown).toEqual([]);
    });
  });
});
