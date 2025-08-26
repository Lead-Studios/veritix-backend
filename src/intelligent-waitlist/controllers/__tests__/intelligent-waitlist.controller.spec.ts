import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentWaitlistController } from '../intelligent-waitlist.controller';
import { IntelligentWaitlistService } from '../../services/intelligent-waitlist.service';
import { QueueManagementService } from '../../services/queue-management.service';
import { VipPriorityService } from '../../services/vip-priority.service';
import { BulkManagementService } from '../../services/bulk-management.service';
import { WaitlistAnalyticsService } from '../../services/waitlist-analytics.service';
import { NotificationCampaignService } from '../../services/notification-campaign.service';
import { WaitlistPriority, WaitlistStatus } from '../../entities/waitlist-entry.entity';
import { NotificationChannel } from '../../entities/waitlist-notification-preference.entity';

describe('IntelligentWaitlistController', () => {
  let controller: IntelligentWaitlistController;
  let waitlistService: jest.Mocked<IntelligentWaitlistService>;
  let queueService: jest.Mocked<QueueManagementService>;
  let vipService: jest.Mocked<VipPriorityService>;
  let bulkService: jest.Mocked<BulkManagementService>;
  let analyticsService: jest.Mocked<WaitlistAnalyticsService>;
  let campaignService: jest.Mocked<NotificationCampaignService>;

  const mockUser = { id: 'user-1' };
  const mockWaitlistEntry = {
    id: 'entry-1',
    userId: 'user-1',
    eventId: 'event-1',
    priority: WaitlistPriority.STANDARD,
    status: WaitlistStatus.ACTIVE,
    position: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligentWaitlistController],
      providers: [
        {
          provide: IntelligentWaitlistService,
          useValue: {
            joinWaitlist: jest.fn(),
            removeFromWaitlist: jest.fn(),
            getUserPosition: jest.fn(),
            updateWaitlistEntry: jest.fn(),
            getUserWaitlistEntries: jest.fn(),
            setNotificationPreferences: jest.fn(),
            getNotificationPreferences: jest.fn(),
            getUserActiveOffers: jest.fn(),
            processTicketOfferResponse: jest.fn(),
            getWaitlistAnalytics: jest.fn(),
          },
        },
        {
          provide: QueueManagementService,
          useValue: {
            processTicketRelease: jest.fn(),
            handleReleaseResponse: jest.fn(),
            recalculatePositions: jest.fn(),
            getQueueMetrics: jest.fn(),
            optimizeQueue: jest.fn(),
          },
        },
        {
          provide: VipPriorityService,
          useValue: {
            upgradeToVip: jest.fn(),
            getVipAnalytics: jest.fn(),
            evaluateVipEligibility: jest.fn(),
            createVipOnlyRelease: jest.fn(),
          },
        },
        {
          provide: BulkManagementService,
          useValue: {
            bulkUpdate: jest.fn(),
            bulkRemove: jest.fn(),
            bulkImport: jest.fn(),
            bulkExport: jest.fn(),
            getBulkOperationStats: jest.fn(),
          },
        },
        {
          provide: WaitlistAnalyticsService,
          useValue: {
            getEventAnalytics: jest.fn(),
            generateAnalyticsReport: jest.fn(),
          },
        },
        {
          provide: NotificationCampaignService,
          useValue: {
            createCampaign: jest.fn(),
            getCampaignTemplates: jest.fn(),
            sendBulkNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IntelligentWaitlistController>(IntelligentWaitlistController);
    waitlistService = module.get(IntelligentWaitlistService);
    queueService = module.get(QueueManagementService);
    vipService = module.get(VipPriorityService);
    bulkService = module.get(BulkManagementService);
    analyticsService = module.get(WaitlistAnalyticsService);
    campaignService = module.get(NotificationCampaignService);
  });

  describe('joinWaitlist', () => {
    it('should join waitlist successfully', async () => {
      const joinDto = {
        eventId: 'event-1',
        maxPriceWilling: 150,
        ticketQuantity: 1,
      };

      waitlistService.joinWaitlist.mockResolvedValue(mockWaitlistEntry as any);

      const result = await controller.joinWaitlist('user-1', joinDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWaitlistEntry);
      expect(waitlistService.joinWaitlist).toHaveBeenCalledWith('user-1', joinDto);
    });
  });

  describe('leaveWaitlist', () => {
    it('should leave waitlist successfully', async () => {
      waitlistService.removeFromWaitlist.mockResolvedValue();

      const result = await controller.leaveWaitlist('user-1', 'event-1');

      expect(result.success).toBe(true);
      expect(waitlistService.removeFromWaitlist).toHaveBeenCalledWith('user-1', 'event-1');
    });
  });

  describe('getPosition', () => {
    it('should return user position', async () => {
      const positionData = {
        position: 5,
        estimatedWaitTime: 48,
        totalAhead: 4,
        priority: WaitlistPriority.STANDARD,
        lastUpdate: new Date(),
      };

      waitlistService.getUserPosition.mockResolvedValue(positionData);

      const result = await controller.getPosition('user-1', 'event-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(positionData);
    });
  });

  describe('updateEntry', () => {
    it('should update waitlist entry', async () => {
      const updateDto = {
        maxPriceWilling: 200,
        ticketQuantity: 2,
      };

      const updatedEntry = { ...mockWaitlistEntry, ...updateDto };
      waitlistService.updateWaitlistEntry.mockResolvedValue(updatedEntry as any);

      const result = await controller.updateEntry('user-1', 'event-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedEntry);
    });
  });

  describe('getMyEntries', () => {
    it('should return user waitlist entries', async () => {
      const entriesData = {
        entries: [mockWaitlistEntry],
        total: 1,
        hasMore: false,
      };

      waitlistService.getUserWaitlistEntries.mockResolvedValue(entriesData as any);

      const result = await controller.getMyEntries('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(entriesData);
    });
  });

  describe('setNotificationPreferences', () => {
    it('should set notification preferences', async () => {
      const preferencesDto = {
        preferences: [
          {
            channel: NotificationChannel.EMAIL,
            enabled: true,
            notificationTypes: { ticketAvailable: true },
          },
        ],
      };

      waitlistService.setNotificationPreferences.mockResolvedValue(preferencesDto.preferences as any);

      const result = await controller.setNotificationPreferences('user-1', 'event-1', preferencesDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(preferencesDto.preferences);
    });
  });

  describe('respondToTicketRelease', () => {
    it('should handle ticket release response', async () => {
      const responseDto = { response: 'accept' as const };
      const responseResult = {
        success: true,
        ticketsReserved: 1,
        nextUserNotified: true,
      };

      queueService.handleReleaseResponse.mockResolvedValue(responseResult);

      const result = await controller.respondToTicketRelease('user-1', 'release-1', responseDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseResult);
    });
  });

  describe('upgradeToVip', () => {
    it('should upgrade user to VIP', async () => {
      const upgradeDto = {
        tier: 'gold',
        reason: 'High-value customer',
      };

      const upgradeResult = {
        success: true,
        newPriority: WaitlistPriority.PREMIUM,
        newPosition: 2,
        positionsSkipped: 8,
        benefits: ['10% discount', 'Priority support'],
      };

      vipService.upgradeToVip.mockResolvedValue(upgradeResult);

      const result = await controller.upgradeToVip('user-1', 'event-1', upgradeDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(upgradeResult);
    });
  });

  describe('getAnalytics', () => {
    it('should return event analytics', async () => {
      const analyticsData = {
        overview: {
          totalWaitlisted: 100,
          activeWaitlisted: 80,
          totalConverted: 15,
          conversionRate: 15,
        },
        trends: [],
        conversionFunnel: { stages: [], dropoffPoints: [], optimizationSuggestions: [] },
      };

      analyticsService.getEventAnalytics.mockResolvedValue(analyticsData as any);

      const result = await controller.getAnalytics('event-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(analyticsData);
    });
  });

  describe('bulkUpdate', () => {
    it('should perform bulk update', async () => {
      const bulkUpdateDto = {
        filter: { eventIds: ['event-1'] },
        updateData: { priority: WaitlistPriority.PREMIUM },
        options: { dryRun: false },
      };

      const bulkResult = {
        success: true,
        processed: 10,
        succeeded: 9,
        failed: 1,
        errors: [],
        summary: 'Updated 9 entries, 1 failed',
      };

      bulkService.bulkUpdate.mockResolvedValue(bulkResult);

      const result = await controller.bulkUpdate(bulkUpdateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(bulkResult);
    });
  });

  describe('bulkImport', () => {
    it('should perform bulk import', async () => {
      const importDto = {
        userData: [
          {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            priority: WaitlistPriority.STANDARD,
          },
        ],
        options: { skipDuplicates: true },
      };

      const importResult = {
        success: true,
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
        summary: 'Imported 1 users, 0 failed',
      };

      bulkService.bulkImport.mockResolvedValue(importResult);

      const result = await controller.bulkImport('event-1', importDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(importResult);
    });
  });

  describe('createCampaign', () => {
    it('should create notification campaign', async () => {
      const campaignDto = {
        eventId: 'event-1',
        template: {
          id: 'position-update',
          name: 'Position Update',
          type: 'position_update' as const,
          channels: [NotificationChannel.EMAIL],
          content: {
            subject: 'Position Update',
            emailTemplate: 'position-update-email',
          },
        },
      };

      const campaignResult = {
        campaignId: 'campaign-1',
        targetedUsers: 50,
        scheduledNotifications: 50,
      };

      campaignService.createCampaign.mockResolvedValue(campaignResult);

      const result = await controller.createCampaign(campaignDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(campaignResult);
    });
  });

  describe('processTicketReleases', () => {
    it('should manually trigger ticket release processing', async () => {
      const releaseData = {
        availableTickets: 10,
        strategy: { batchSize: 5 },
      };

      const releaseResult = {
        releasesCreated: 5,
        usersNotified: 5,
        nextBatchScheduled: true,
      };

      queueService.processTicketRelease.mockResolvedValue(releaseResult);

      const result = await controller.processTicketReleases('event-1', releaseData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(releaseResult);
    });
  });

  describe('recalculatePositions', () => {
    it('should recalculate waitlist positions', async () => {
      queueService.recalculatePositions.mockResolvedValue();

      const result = await controller.recalculatePositions('event-1');

      expect(result.success).toBe(true);
      expect(queueService.recalculatePositions).toHaveBeenCalledWith('event-1');
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = {
        totalActive: 100,
        averageWaitTime: 48,
        conversionRate: 15.5,
        positionMovement: 2.3,
        estimatedProcessingTime: 72,
      };

      queueService.getQueueMetrics.mockResolvedValue(metrics);

      const result = await controller.getQueueMetrics('event-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(metrics);
    });
  });

  describe('getHealth', () => {
    it('should return system health status', async () => {
      const result = await controller.getHealth();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.services).toBeDefined();
    });
  });
});
