import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { PassSharingService } from '../services/pass-sharing.service';
import { WalletPass, PassStatus } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

describe('PassSharingService', () => {
  let service: PassSharingService;
  let passRepository: Repository<WalletPass>;
  let analyticsRepository: Repository<PassAnalytics>;
  let sharingQueue: Queue;

  const mockPassRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockAnalyticsRepository = {
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSharingQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassSharingService,
        {
          provide: getRepositoryToken(WalletPass),
          useValue: mockPassRepository,
        },
        {
          provide: getRepositoryToken(PassAnalytics),
          useValue: mockAnalyticsRepository,
        },
        {
          provide: getQueueToken('pass-sharing'),
          useValue: mockSharingQueue,
        },
      ],
    }).compile();

    service = module.get<PassSharingService>(PassSharingService);
    passRepository = module.get<Repository<WalletPass>>(getRepositoryToken(WalletPass));
    analyticsRepository = module.get<Repository<PassAnalytics>>(getRepositoryToken(PassAnalytics));
    sharingQueue = module.get<Queue>(getQueueToken('pass-sharing'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sharePass', () => {
    it('should share pass successfully', async () => {
      const passId = 'pass-123';
      const userId = 'user-123';
      const shareData = {
        recipients: ['user1@example.com', 'user2@example.com'],
        message: 'Check out this event!',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      const mockPass = {
        id: passId,
        userId,
        status: PassStatus.ACTIVE,
        passData: {
          eventName: 'Test Event',
          venueName: 'Test Venue',
        },
        event: {
          name: 'Test Event',
        },
        user: {
          name: 'John Doe',
        },
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.sharePass(passId, userId, shareData);

      expect(result).toEqual({
        success: true,
        shareToken: expect.any(String),
        shareUrl: expect.stringContaining('/share/'),
        expiresAt: shareData.expiresAt,
        recipients: shareData.recipients,
      });

      expect(mockPassRepository.update).toHaveBeenCalledWith(
        passId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            sharing: expect.objectContaining({
              isShared: true,
              shareCount: 1,
            }),
          }),
        })
      );

      expect(mockSharingQueue.add).toHaveBeenCalledWith(
        'send-share-notifications',
        expect.objectContaining({
          passId,
          recipients: shareData.recipients,
        })
      );

      expect(mockAnalyticsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPassId: passId,
          eventType: AnalyticsEventType.PASS_SHARED,
        })
      );
    });

    it('should return error for non-existent pass', async () => {
      const passId = 'non-existent';
      const userId = 'user-123';
      const shareData = {
        recipients: ['user1@example.com'],
      };

      mockPassRepository.findOne.mockResolvedValue(null);

      const result = await service.sharePass(passId, userId, shareData);

      expect(result).toEqual({
        success: false,
        error: 'Pass not found',
      });
    });

    it('should return error for unauthorized user', async () => {
      const passId = 'pass-123';
      const userId = 'unauthorized-user';
      const shareData = {
        recipients: ['user1@example.com'],
      };

      const mockPass = {
        id: passId,
        userId: 'different-user',
        status: PassStatus.ACTIVE,
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      const result = await service.sharePass(passId, userId, shareData);

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized to share this pass',
      });
    });
  });

  describe('getSharedPass', () => {
    it('should get shared pass successfully', async () => {
      const shareToken = 'share-token-123';

      const mockPass = {
        id: 'pass-123',
        status: PassStatus.ACTIVE,
        passData: {
          eventName: 'Test Event',
        },
        metadata: {
          sharing: {
            isShared: true,
            shareTokens: [
              {
                token: shareToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
                isActive: true,
              },
            ],
          },
        },
        event: {
          name: 'Test Event',
          date: new Date(),
        },
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      const result = await service.getSharedPass(shareToken);

      expect(result).toEqual({
        success: true,
        pass: expect.objectContaining({
          id: 'pass-123',
          eventName: 'Test Event',
        }),
        canDownload: true,
      });

      expect(mockAnalyticsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPassId: 'pass-123',
          eventType: AnalyticsEventType.SHARED_PASS_ACCESSED,
        })
      );
    });

    it('should return error for invalid share token', async () => {
      const shareToken = 'invalid-token';

      mockPassRepository.findOne.mockResolvedValue(null);

      const result = await service.getSharedPass(shareToken);

      expect(result).toEqual({
        success: false,
        error: 'Invalid or expired share link',
      });
    });

    it('should return error for expired share token', async () => {
      const shareToken = 'expired-token';

      const mockPass = {
        id: 'pass-123',
        status: PassStatus.ACTIVE,
        metadata: {
          sharing: {
            isShared: true,
            shareTokens: [
              {
                token: shareToken,
                expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                isActive: true,
              },
            ],
          },
        },
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      const result = await service.getSharedPass(shareToken);

      expect(result).toEqual({
        success: false,
        error: 'Share link has expired',
      });
    });
  });

  describe('revokeSharing', () => {
    it('should revoke sharing successfully', async () => {
      const passId = 'pass-123';
      const userId = 'user-123';
      const shareToken = 'share-token-123';

      const mockPass = {
        id: passId,
        userId,
        status: PassStatus.ACTIVE,
        metadata: {
          sharing: {
            isShared: true,
            shareTokens: [
              {
                token: shareToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                isActive: true,
              },
            ],
          },
        },
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.revokeSharing(passId, userId, shareToken);

      expect(result).toEqual({
        success: true,
        revokedAt: expect.any(Date),
      });

      expect(mockPassRepository.update).toHaveBeenCalledWith(
        passId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            sharing: expect.objectContaining({
              shareTokens: expect.arrayContaining([
                expect.objectContaining({
                  token: shareToken,
                  isActive: false,
                  revokedAt: expect.any(Date),
                }),
              ]),
            }),
          }),
        })
      );
    });
  });

  describe('getSharingAnalytics', () => {
    it('should get sharing analytics successfully', async () => {
      const passId = 'pass-123';
      const userId = 'user-123';

      const mockPass = {
        id: passId,
        userId,
      };

      const mockAnalytics = [
        {
          eventType: AnalyticsEventType.PASS_SHARED,
          timestamp: new Date(),
          eventData: { shareCount: 2 },
        },
        {
          eventType: AnalyticsEventType.SHARED_PASS_ACCESSED,
          timestamp: new Date(),
          eventData: { accessCount: 5 },
        },
      ];

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);

      const result = await service.getSharingAnalytics(passId, userId);

      expect(result).toEqual({
        success: true,
        analytics: expect.objectContaining({
          totalShares: expect.any(Number),
          totalAccesses: expect.any(Number),
          shareEvents: expect.any(Array),
        }),
      });
    });

    it('should return error for unauthorized user', async () => {
      const passId = 'pass-123';
      const userId = 'unauthorized-user';

      const mockPass = {
        id: passId,
        userId: 'different-user',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      const result = await service.getSharingAnalytics(passId, userId);

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized to view analytics for this pass',
      });
    });
  });

  describe('shareGroupBooking', () => {
    it('should share group booking successfully', async () => {
      const eventId = 'event-123';
      const organizerId = 'organizer-123';
      const shareData = {
        passIds: ['pass-1', 'pass-2', 'pass-3'],
        recipients: ['user1@example.com', 'user2@example.com'],
        message: 'Group booking for our event!',
        groupName: 'Team Outing',
      };

      const mockPasses = [
        { id: 'pass-1', eventId, status: PassStatus.ACTIVE },
        { id: 'pass-2', eventId, status: PassStatus.ACTIVE },
        { id: 'pass-3', eventId, status: PassStatus.ACTIVE },
      ];

      mockPassRepository.findOne
        .mockResolvedValueOnce(mockPasses[0])
        .mockResolvedValueOnce(mockPasses[1])
        .mockResolvedValueOnce(mockPasses[2]);

      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.shareGroupBooking(eventId, organizerId, shareData);

      expect(result).toEqual({
        success: true,
        groupShareToken: expect.any(String),
        groupShareUrl: expect.stringContaining('/group-share/'),
        sharedPasses: 3,
        recipients: shareData.recipients,
      });

      expect(mockPassRepository.update).toHaveBeenCalledTimes(3);
      expect(mockSharingQueue.add).toHaveBeenCalledWith(
        'send-share-notifications',
        expect.objectContaining({
          eventName: expect.any(String),
          recipients: shareData.recipients,
        })
      );
    });
  });
});
