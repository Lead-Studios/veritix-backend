import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository, EntityManager } from 'typeorm';
import { IntelligentWaitlistService } from '../intelligent-waitlist.service';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../../entities/waitlist-entry.entity';
import { WaitlistNotificationPreference, NotificationChannel } from '../../entities/waitlist-notification-preference.entity';
import { WaitlistTicketRelease, ReleaseStatus } from '../../entities/waitlist-ticket-release.entity';
import { WaitlistAnalytics } from '../../entities/waitlist-analytics.entity';
import { User } from '../../../users/entities/user.entity';
import { Event } from '../../../events/entities/event.entity';

describe('IntelligentWaitlistService', () => {
  let service: IntelligentWaitlistService;
  let waitlistRepository: jest.Mocked<Repository<IntelligentWaitlistEntry>>;
  let preferencesRepository: jest.Mocked<Repository<WaitlistNotificationPreference>>;
  let releaseRepository: jest.Mocked<Repository<WaitlistTicketRelease>>;
  let analyticsRepository: jest.Mocked<Repository<WaitlistAnalytics>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let entityManager: jest.Mocked<EntityManager>;
  let notificationQueue: any;
  let analyticsQueue: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    availableTickets: 0,
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
    user: mockUser,
    event: mockEvent,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentWaitlistService,
        {
          provide: getRepositoryToken(IntelligentWaitlistEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WaitlistNotificationPreference),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WaitlistTicketRelease),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WaitlistAnalytics),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getQueueToken('waitlist-notifications'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: getQueueToken('waitlist-analytics'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IntelligentWaitlistService>(IntelligentWaitlistService);
    waitlistRepository = module.get(getRepositoryToken(IntelligentWaitlistEntry));
    preferencesRepository = module.get(getRepositoryToken(WaitlistNotificationPreference));
    releaseRepository = module.get(getRepositoryToken(WaitlistTicketRelease));
    analyticsRepository = module.get(getRepositoryToken(WaitlistAnalytics));
    userRepository = module.get(getRepositoryToken(User));
    eventRepository = module.get(getRepositoryToken(Event));
    entityManager = module.get(EntityManager);
    notificationQueue = module.get(getQueueToken('waitlist-notifications'));
    analyticsQueue = module.get(getQueueToken('waitlist-analytics'));
  });

  describe('joinWaitlist', () => {
    it('should successfully join waitlist', async () => {
      const joinDto = {
        eventId: 'event-1',
        maxPriceWilling: 150,
        ticketQuantity: 1,
        priority: WaitlistPriority.STANDARD,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);
      eventRepository.findOne.mockResolvedValue(mockEvent as any);
      waitlistRepository.findOne.mockResolvedValue(null);
      waitlistRepository.count.mockResolvedValue(5);
      waitlistRepository.create.mockReturnValue(mockWaitlistEntry as any);
      waitlistRepository.save.mockResolvedValue(mockWaitlistEntry as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.joinWaitlist('user-1', joinDto);

      expect(result).toEqual(mockWaitlistEntry);
      expect(waitlistRepository.save).toHaveBeenCalled();
      expect(notificationQueue.add).toHaveBeenCalledWith('send-welcome-notification', expect.any(Object));
    });

    it('should throw error if user already on waitlist', async () => {
      const joinDto = {
        eventId: 'event-1',
        maxPriceWilling: 150,
        ticketQuantity: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);
      eventRepository.findOne.mockResolvedValue(mockEvent as any);
      waitlistRepository.findOne.mockResolvedValue(mockWaitlistEntry as any);

      await expect(service.joinWaitlist('user-1', joinDto)).rejects.toThrow('User is already on the waitlist');
    });

    it('should throw error if event has available tickets', async () => {
      const joinDto = {
        eventId: 'event-1',
        maxPriceWilling: 150,
        ticketQuantity: 1,
      };

      const eventWithTickets = { ...mockEvent, availableTickets: 10 };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      eventRepository.findOne.mockResolvedValue(eventWithTickets as any);
      waitlistRepository.findOne.mockResolvedValue(null);

      await expect(service.joinWaitlist('user-1', joinDto)).rejects.toThrow('Event has available tickets');
    });
  });

  describe('removeFromWaitlist', () => {
    it('should successfully remove from waitlist', async () => {
      waitlistRepository.findOne.mockResolvedValue(mockWaitlistEntry as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      await service.removeFromWaitlist('user-1', 'event-1');

      expect(waitlistRepository.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          status: WaitlistStatus.REMOVED,
        })
      );
    });

    it('should throw error if waitlist entry not found', async () => {
      waitlistRepository.findOne.mockResolvedValue(null);

      await expect(service.removeFromWaitlist('user-1', 'event-1')).rejects.toThrow('Waitlist entry not found');
    });
  });

  describe('getUserPosition', () => {
    it('should return user position information', async () => {
      waitlistRepository.findOne.mockResolvedValue(mockWaitlistEntry as any);

      const result = await service.getUserPosition('user-1', 'event-1');

      expect(result).toEqual({
        position: 1,
        estimatedWaitTime: 24,
        totalAhead: 0,
        priority: WaitlistPriority.STANDARD,
        lastUpdate: expect.any(Date),
      });
    });

    it('should throw error if user not on waitlist', async () => {
      waitlistRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserPosition('user-1', 'event-1')).rejects.toThrow('User is not on the waitlist');
    });
  });

  describe('updateWaitlistEntry', () => {
    it('should successfully update waitlist entry', async () => {
      const updateDto = {
        maxPriceWilling: 200,
        ticketQuantity: 2,
      };

      waitlistRepository.findOne.mockResolvedValue(mockWaitlistEntry as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);
      waitlistRepository.findOne.mockResolvedValueOnce(mockWaitlistEntry as any)
        .mockResolvedValueOnce({ ...mockWaitlistEntry, ...updateDto } as any);

      const result = await service.updateWaitlistEntry('user-1', 'event-1', updateDto);

      expect(result.maxPriceWilling).toBe(200);
      expect(result.ticketQuantity).toBe(2);
      expect(waitlistRepository.update).toHaveBeenCalled();
    });
  });

  describe('setNotificationPreferences', () => {
    it('should set notification preferences', async () => {
      const preferences = [
        {
          channel: NotificationChannel.EMAIL,
          enabled: true,
          notificationTypes: { ticketAvailable: true },
        },
      ];

      waitlistRepository.findOne.mockResolvedValue(mockWaitlistEntry as any);
      preferencesRepository.delete.mockResolvedValue({ affected: 0 } as any);
      preferencesRepository.save.mockResolvedValue(preferences as any);

      const result = await service.setNotificationPreferences('user-1', 'event-1', preferences);

      expect(preferencesRepository.delete).toHaveBeenCalled();
      expect(preferencesRepository.save).toHaveBeenCalled();
      expect(result).toEqual(preferences);
    });
  });

  describe('processTicketOffer', () => {
    it('should handle ticket offer acceptance', async () => {
      const mockRelease = {
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
        ticketQuantity: 1,
        offerPrice: 100,
        waitlistEntry: mockWaitlistEntry,
      };

      releaseRepository.findOne.mockResolvedValue(mockRelease as any);
      releaseRepository.update.mockResolvedValue({ affected: 1 } as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.processTicketOfferResponse('release-1', 'accept');

      expect(result.success).toBe(true);
      expect(releaseRepository.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.ACCEPTED,
        })
      );
    });

    it('should handle ticket offer decline', async () => {
      const mockRelease = {
        id: 'release-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ReleaseStatus.OFFERED,
        waitlistEntry: mockWaitlistEntry,
      };

      releaseRepository.findOne.mockResolvedValue(mockRelease as any);
      releaseRepository.update.mockResolvedValue({ affected: 1 } as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.processTicketOfferResponse('release-1', 'decline');

      expect(result.success).toBe(true);
      expect(releaseRepository.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.DECLINED,
        })
      );
    });
  });

  describe('getUserWaitlistEntries', () => {
    it('should return user waitlist entries with pagination', async () => {
      const mockEntries = [mockWaitlistEntry];
      waitlistRepository.find.mockResolvedValue(mockEntries as any);
      waitlistRepository.count.mockResolvedValue(1);

      const result = await service.getUserWaitlistEntries('user-1', {}, { limit: 10, offset: 0 });

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('bulkUpdatePositions', () => {
    it('should update positions for multiple entries', async () => {
      const entries = [
        { ...mockWaitlistEntry, id: 'entry-1', position: 1 },
        { ...mockWaitlistEntry, id: 'entry-2', position: 2 },
      ];

      waitlistRepository.find.mockResolvedValue(entries as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.bulkUpdatePositions('event-1', [
        { entryId: 'entry-1', newPosition: 2 },
        { entryId: 'entry-2', newPosition: 1 },
      ]);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(waitlistRepository.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWaitlistAnalytics', () => {
    it('should return basic analytics', async () => {
      waitlistRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2); // converted

      const result = await service.getWaitlistAnalytics('event-1');

      expect(result.totalWaitlisted).toBe(10);
      expect(result.activeWaitlisted).toBe(8);
      expect(result.totalConverted).toBe(2);
      expect(result.conversionRate).toBe(20);
    });
  });

  describe('cleanupExpiredOffers', () => {
    it('should cleanup expired ticket offers', async () => {
      const expiredOffers = [
        {
          id: 'release-1',
          status: ReleaseStatus.OFFERED,
          expiresAt: new Date(Date.now() - 1000),
          waitlistEntry: mockWaitlistEntry,
        },
      ];

      releaseRepository.find.mockResolvedValue(expiredOffers as any);
      releaseRepository.update.mockResolvedValue({ affected: 1 } as any);
      waitlistRepository.update.mockResolvedValue({ affected: 1 } as any);

      entityManager.transaction.mockImplementation(async (callback) => {
        return await callback(entityManager);
      });

      const result = await service.cleanupExpiredOffers();

      expect(result.cleaned).toBe(1);
      expect(releaseRepository.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.EXPIRED,
        })
      );
    });
  });
});
