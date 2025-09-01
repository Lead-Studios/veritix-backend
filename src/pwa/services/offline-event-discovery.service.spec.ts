import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfflineEventDiscoveryService } from './offline-event-discovery.service';
import { OfflineData, OfflineDataType, SyncStatus } from '../entities/offline-data.entity';
import { PWACache } from '../entities/pwa-cache.entity';
import { PWAAnalytics } from '../entities/pwa-analytics.entity';
import { Event } from '../../events/entities/event.entity';

describe('OfflineEventDiscoveryService', () => {
  let service: OfflineEventDiscoveryService;
  let offlineDataRepository: jest.Mocked<Repository<OfflineData>>;
  let cacheRepository: jest.Mocked<Repository<PWACache>>;
  let analyticsRepository: jest.Mocked<Repository<PWAAnalytics>>;
  let eventRepository: jest.Mocked<Repository<Event>>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockEvent = {
    id: 'event-123',
    title: 'Test Concert',
    description: 'Amazing live music event',
    imageUrl: 'https://example.com/image.jpg',
    startDate: new Date('2024-12-01T20:00:00Z'),
    endDate: new Date('2024-12-01T23:00:00Z'),
    minPrice: 50,
    maxPrice: 150,
    currency: 'USD',
    attendeeCount: 500,
    rating: 4.5,
    reviewCount: 25,
    totalTickets: 1000,
    availableTickets: 200,
    soldOut: false,
    tags: ['music', 'concert'],
    venue: {
      name: 'Test Venue',
      address: '123 Main St',
      city: 'San Francisco',
      coordinates: { lat: 37.7749, lng: -122.4194 },
    },
    organizer: {
      name: 'Test Organizer',
      isVerified: true,
    },
    category: {
      name: 'Music',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineEventDiscoveryService,
        {
          provide: getRepositoryToken(OfflineData),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PWACache),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PWAAnalytics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OfflineEventDiscoveryService>(OfflineEventDiscoveryService);
    offlineDataRepository = module.get(getRepositoryToken(OfflineData));
    cacheRepository = module.get(getRepositoryToken(PWACache));
    analyticsRepository = module.get(getRepositoryToken(PWAAnalytics));
    eventRepository = module.get(getRepositoryToken(Event));
  });

  describe('cacheEventsForOfflineDiscovery', () => {
    it('should cache events for offline discovery', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEvent]),
      };

      eventRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      offlineDataRepository.save.mockResolvedValue({} as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      await service.cacheEventsForOfflineDiscovery(mockUser.id, 'San Francisco');

      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(offlineDataRepository.save).toHaveBeenCalledTimes(2); // Event + metadata
      expect(analyticsRepository.save).toHaveBeenCalled();
    });
  });

  describe('discoverEventsOffline', () => {
    it('should discover cached events offline', async () => {
      const mockCachedEvent = {
        id: 'cached-123',
        userId: mockUser.id,
        entityId: mockEvent.id,
        dataType: OfflineDataType.EVENT,
        data: mockEvent,
        accessCount: 5,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCachedEvent]),
      };

      offlineDataRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      const result = await service.discoverEventsOffline(mockUser.id, {
        category: 'Music',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockEvent.title);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "data.data->>'category' = :category",
        { category: 'Music' }
      );
    });

    it('should apply date range filters', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      offlineDataRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-31'),
      };

      await service.discoverEventsOffline(mockUser.id, { dateRange });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(data.data->>'startDate')::timestamp >= :startDate",
        { startDate: dateRange.start }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(data.data->>'startDate')::timestamp <= :endDate",
        { endDate: dateRange.end }
      );
    });
  });

  describe('getCachedEventDetails', () => {
    it('should return cached event details', async () => {
      const mockCachedEvent = {
        id: 'cached-123',
        userId: mockUser.id,
        entityId: mockEvent.id,
        dataType: OfflineDataType.EVENT,
        data: mockEvent,
        accessCount: 5,
        isExpired: false,
      };

      offlineDataRepository.findOne.mockResolvedValue(mockCachedEvent as any);
      offlineDataRepository.update.mockResolvedValue({} as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      const result = await service.getCachedEventDetails(mockUser.id, mockEvent.id);

      expect(result).toEqual(mockEvent);
      expect(offlineDataRepository.update).toHaveBeenCalledWith(
        mockCachedEvent.id,
        expect.objectContaining({
          accessCount: 6,
          lastAccessed: expect.any(Date),
        })
      );
    });

    it('should return null for expired events', async () => {
      const mockExpiredEvent = {
        id: 'cached-123',
        isExpired: true,
      };

      offlineDataRepository.findOne.mockResolvedValue(mockExpiredEvent as any);

      const result = await service.getCachedEventDetails(mockUser.id, mockEvent.id);

      expect(result).toBeNull();
    });
  });

  describe('searchCachedEvents', () => {
    it('should search cached events by title', async () => {
      const mockCachedEvent = {
        data: mockEvent,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCachedEvent]),
      };

      offlineDataRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      const result = await service.searchCachedEvents(mockUser.id, 'concert');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockEvent.title);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(data.data->>\'title\') LIKE LOWER(:searchTerm)'),
        { searchTerm: '%concert%' }
      );
    });
  });

  describe('getOfflineDiscoveryStats', () => {
    it('should return discovery statistics', async () => {
      const mockStats = {
        totalEvents: '10',
        activeEvents: '8',
        recentlyAccessed: '5',
        totalAccesses: '50',
        avgAccesses: '5.0',
      };

      const mockCategories = [
        { category: 'Music', count: '5' },
        { category: 'Sports', count: '3' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockCategories),
      };

      offlineDataRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder as any)
        .mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.getOfflineDiscoveryStats(mockUser.id);

      expect(result.totalEvents).toBe('10');
      expect(result.categories).toEqual({
        Music: 5,
        Sports: 3,
      });
    });
  });

  describe('refreshEventCache', () => {
    it('should refresh event cache successfully', async () => {
      eventRepository.findOne.mockResolvedValue(mockEvent as any);
      offlineDataRepository.update.mockResolvedValue({} as any);

      const result = await service.refreshEventCache(mockUser.id, mockEvent.id);

      expect(result).toBe(true);
      expect(eventRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
        relations: ['venue', 'organizer', 'category'],
      });
      expect(offlineDataRepository.update).toHaveBeenCalled();
    });

    it('should return false for non-existent events', async () => {
      eventRepository.findOne.mockResolvedValue(null);

      const result = await service.refreshEventCache(mockUser.id, 'non-existent');

      expect(result).toBe(false);
    });
  });
});
