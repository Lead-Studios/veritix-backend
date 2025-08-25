import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository, EntityManager } from 'typeorm';
import { QueueManagementService } from '../queue-management.service';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../../entities/waitlist-entry.entity';
import { WaitlistTicketRelease, ReleaseStatus, ReleaseReason } from '../../entities/waitlist-ticket-release.entity';
import { Event } from '../../../events/entities/event.entity';
import { Ticket } from '../../../tickets/entities/ticket.entity';

describe('QueueManagementService', () => {
  let service: QueueManagementService;
  let waitlistRepository: jest.Mocked<Repository<IntelligentWaitlistEntry>>;
  let releaseRepository: jest.Mocked<Repository<WaitlistTicketRelease>>;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let ticketRepository: jest.Mocked<Repository<Ticket>>;
  let entityManager: jest.Mocked<EntityManager>;
  let ticketReleaseQueue: any;
  let notificationQueue: any;

  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    availableTickets: 10,
    ticketPrice: 100,
  };

  const mockWaitlistEntry = {
    id: 'entry-1',
    userId: 'user-1',
    eventId: 'event-1',
    priority: WaitlistPriority.STANDARD,
    status: WaitlistStatus.ACTIVE,
    position: 1,
    ticketQuantity: 1,
    maxPriceWilling: 150,
    createdAt: new Date(),
    estimatedWaitTime: 24,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        {
          provide: getRepositoryToken(IntelligentWaitlistEntry),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WaitlistTicketRelease),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getQueueToken('ticket-releases'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: getQueueToken('waitlist-notifications'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
    waitlistRepository = module.get(getRepositoryToken(IntelligentWaitlistEntry));
    releaseRepository = module.get(getRepositoryToken(WaitlistTicketRelease));
    eventRepository = module.get(getRepositoryToken(Event));
    ticketRepository = module.get(getRepositoryToken(Ticket));
    entityManager = module.get(EntityManager);
    ticketReleaseQueue = module.get(getQueueToken('ticket-releases'));
    notificationQueue = module.get(getQueueToken('waitlist-notifications'));
  });

  describe('processTicketRelease', () => {
    it('should process ticket release successfully', async () => {
      const eligibleEntries = [
        { ...mockWaitlistEntry, id: 'entry-1', priority: WaitlistPriority.VIP },
        { ...mockWaitlistEntry, id: 'entry-2', priority: WaitlistPriority.STANDARD },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getMany: jest.fn().mockResolvedValue(eligibleEntries),
      };

      entityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      entityManager.create.mockReturnValue({
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
      } as any);

      entityManager.save.mockResolvedValue({
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
      } as any);

      const result = await service.processTicketRelease('event-1', 5);

      expect(result.releasesCreated).toBeGreaterThan(0);
      expect(result.usersNotified).toBeGreaterThan(0);
      expect(notificationQueue.add).toHaveBeenCalled();
    });

    it('should return zero releases when no eligible entries', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getMany: jest.fn().mockResolvedValue([]),
      };

      entityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.processTicketRelease('event-1', 5);

      expect(result.releasesCreated).toBe(0);
      expect(result.usersNotified).toBe(0);
    });
  });

  describe('recalculatePositions', () => {
    it('should recalculate positions correctly', async () => {
      const entries = [
        { ...mockWaitlistEntry, id: 'entry-1', priority: WaitlistPriority.VIP },
        { ...mockWaitlistEntry, id: 'entry-2', priority: WaitlistPriority.PREMIUM },
        { ...mockWaitlistEntry, id: 'entry-3', priority: WaitlistPriority.STANDARD },
      ];

      entityManager.find.mockResolvedValue(entries as any);
      entityManager.update.mockResolvedValue({ affected: 1 } as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      await service.recalculatePositions('event-1');

      expect(entityManager.update).toHaveBeenCalledTimes(3);
      expect(entityManager.update).toHaveBeenCalledWith(
        IntelligentWaitlistEntry,
        'entry-1',
        expect.objectContaining({ position: 1 })
      );
    });
  });

  describe('handleReleaseResponse', () => {
    it('should handle accept response correctly', async () => {
      const mockRelease = {
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
        ticketQuantity: 1,
        offerPrice: 100,
        waitlistEntry: { id: 'entry-1' },
      };

      entityManager.findOne.mockResolvedValue(mockRelease as any);
      entityManager.update.mockResolvedValue({ affected: 1 } as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      // Mock reserveTickets method
      jest.spyOn(service as any, 'reserveTickets').mockResolvedValue(1);
      jest.spyOn(service as any, 'processNextInQueue').mockResolvedValue(true);

      const result = await service.handleReleaseResponse('release-1', 'accept');

      expect(result.success).toBe(true);
      expect(result.ticketsReserved).toBe(1);
      expect(entityManager.update).toHaveBeenCalledWith(
        WaitlistTicketRelease,
        'release-1',
        expect.objectContaining({ status: ReleaseStatus.ACCEPTED })
      );
    });

    it('should handle decline response correctly', async () => {
      const mockRelease = {
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
        waitlistEntry: { id: 'entry-1' },
      };

      entityManager.findOne.mockResolvedValue(mockRelease as any);
      entityManager.update.mockResolvedValue({ affected: 1 } as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      jest.spyOn(service, 'recalculatePositions').mockResolvedValue();
      jest.spyOn(service as any, 'processNextInQueue').mockResolvedValue(true);

      const result = await service.handleReleaseResponse('release-1', 'decline');

      expect(result.success).toBe(true);
      expect(entityManager.update).toHaveBeenCalledWith(
        WaitlistTicketRelease,
        'release-1',
        expect.objectContaining({ status: ReleaseStatus.DECLINED })
      );
    });

    it('should throw error for invalid release', async () => {
      entityManager.findOne.mockResolvedValue(null);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      await expect(service.handleReleaseResponse('invalid-id', 'accept'))
        .rejects.toThrow('Invalid or expired ticket release');
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      waitlistRepository.count.mockResolvedValue(10);
      
      jest.spyOn(service as any, 'calculateAverageWaitTime').mockResolvedValue(24);
      jest.spyOn(service as any, 'calculateConversionRate').mockResolvedValue(15.5);
      jest.spyOn(service as any, 'calculatePositionMovement').mockResolvedValue(2.3);
      jest.spyOn(service as any, 'calculateEstimatedProcessingTime').mockResolvedValue(48);

      const result = await service.getQueueMetrics('event-1');

      expect(result.totalActive).toBe(10);
      expect(result.averageWaitTime).toBe(24);
      expect(result.conversionRate).toBe(15.5);
      expect(result.positionMovement).toBe(2.3);
      expect(result.estimatedProcessingTime).toBe(48);
    });
  });

  describe('optimizeQueue', () => {
    it('should return optimization recommendations', async () => {
      jest.spyOn(service, 'getQueueMetrics').mockResolvedValue({
        totalActive: 100,
        averageWaitTime: 48,
        conversionRate: 12,
        positionMovement: 1.5,
        estimatedProcessingTime: 72,
      });

      jest.spyOn(service as any, 'getHistoricalPerformance').mockResolvedValue({
        averageConversionRate: 15,
        peakProcessingHours: [10, 14, 18],
      });

      jest.spyOn(service as any, 'generateOptimizedStrategy').mockResolvedValue({
        batchSize: 15,
        releaseInterval: 10,
        priorityWeights: {
          VIP: 10,
          PREMIUM: 5,
          STANDARD: 1,
        },
        maxOffersPerUser: 3,
        offerExpirationHours: 24,
        considerSeatPreferences: true,
        priceFlexibility: 10,
      });

      jest.spyOn(service as any, 'projectImprovements').mockResolvedValue({
        expectedConversionIncrease: 3.5,
        estimatedTimeReduction: 12,
      });

      jest.spyOn(service as any, 'generateImplementationPlan').mockResolvedValue([
        'Increase batch size to 15',
        'Reduce release interval to 10 minutes',
        'Implement dynamic pricing',
      ]);

      const result = await service.optimizeQueue('event-1');

      expect(result.recommendedStrategy).toBeDefined();
      expect(result.projectedImprovements).toBeDefined();
      expect(result.implementationPlan).toBeDefined();
      expect(result.implementationPlan.length).toBeGreaterThan(0);
    });
  });

  describe('cleanupExpiredOffers', () => {
    it('should cleanup expired offers', async () => {
      const expiredOffers = [
        {
          id: 'release-1',
          status: ReleaseStatus.OFFERED,
          expiresAt: new Date(Date.now() - 1000),
          eventId: 'event-1',
          waitlistEntry: { id: 'entry-1' },
        },
      ];

      releaseRepository.find.mockResolvedValue(expiredOffers as any);
      entityManager.update.mockResolvedValue({ affected: 1 } as any);
      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      jest.spyOn(service as any, 'processNextInQueue').mockResolvedValue(true);

      await service.cleanupExpiredOffers();

      expect(entityManager.update).toHaveBeenCalledWith(
        WaitlistTicketRelease,
        'release-1',
        expect.objectContaining({ status: ReleaseStatus.EXPIRED })
      );
    });
  });

  describe('processPendingReleases', () => {
    it('should process pending releases for events with available tickets', async () => {
      const eventsWithTickets = [
        { id: 'event-1', availableTickets: 5 },
        { id: 'event-2', availableTickets: 3 },
      ];

      jest.spyOn(service as any, 'getEventsWithAvailableTickets')
        .mockResolvedValue(eventsWithTickets);
      
      jest.spyOn(service, 'processTicketRelease').mockResolvedValue({
        releasesCreated: 2,
        usersNotified: 2,
        nextBatchScheduled: false,
      });

      await service.processPendingReleases();

      expect(service.processTicketRelease).toHaveBeenCalledTimes(2);
      expect(service.processTicketRelease).toHaveBeenCalledWith('event-1', 5);
      expect(service.processTicketRelease).toHaveBeenCalledWith('event-2', 3);
    });
  });
});
