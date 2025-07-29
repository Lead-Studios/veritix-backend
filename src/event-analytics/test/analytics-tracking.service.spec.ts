import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsTrackingService } from '../services/analytics-tracking.service';
import { EventView } from '../entities/event-view.entity';
import { PurchaseLog } from '../entities/purchase-log.entity';
import {
  EventEngagement,
  EngagementType,
} from '../entities/event-engagement.entity';
import { TrackViewDto } from '../dto/track-view.dto';
import { TrackPurchaseDto } from '../dto/track-purchase.dto';
import { TrackEngagementDto } from '../dto/track-engagement.dto';
import { jest } from '@jest/globals';

describe('AnalyticsTrackingService', () => {
  let service: AnalyticsTrackingService;
  let eventViewRepository: Repository<EventView>;
  let purchaseLogRepository: Repository<PurchaseLog>;
  let eventEngagementRepository: Repository<EventEngagement>;

  const mockEventViewRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockPurchaseLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEventEngagementRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsTrackingService,
        {
          provide: getRepositoryToken(EventView),
          useValue: mockEventViewRepository,
        },
        {
          provide: getRepositoryToken(PurchaseLog),
          useValue: mockPurchaseLogRepository,
        },
        {
          provide: getRepositoryToken(EventEngagement),
          useValue: mockEventEngagementRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsTrackingService>(AnalyticsTrackingService);
    eventViewRepository = module.get<Repository<EventView>>(
      getRepositoryToken(EventView),
    );
    purchaseLogRepository = module.get<Repository<PurchaseLog>>(
      getRepositoryToken(PurchaseLog),
    );
    eventEngagementRepository = module.get<Repository<EventEngagement>>(
      getRepositoryToken(EventEngagement),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackView', () => {
    it('should track event view successfully', async () => {
      const trackViewDto: TrackViewDto = {
        eventId: 'event-123',
        userId: 'user-456',
        trafficSource: 'google',
        referrerUrl: 'https://google.com/search',
        utmSource: 'google',
        utmMedium: 'organic',
        utmCampaign: 'tech-conference',
        deviceType: 'desktop',
        timeOnPage: 180,
      };

      const mockEventView = {
        id: 'view-123',
        ...trackViewDto,
        ipAddress: '192.168.1.1',
      };

      mockEventViewRepository.create.mockReturnValue(mockEventView);
      mockEventViewRepository.save.mockResolvedValue(mockEventView);

      await service.trackView(trackViewDto, '192.168.1.1');

      expect(mockEventViewRepository.create).toHaveBeenCalledWith({
        ...trackViewDto,
        ipAddress: '192.168.1.1',
        trafficSource: 'google',
      });
      expect(mockEventViewRepository.save).toHaveBeenCalledWith(mockEventView);
    });

    it('should normalize traffic source from referrer URL', async () => {
      const trackViewDto: TrackViewDto = {
        eventId: 'event-123',
        referrerUrl: 'https://facebook.com/page',
      };

      const mockEventView = {
        id: 'view-123',
        ...trackViewDto,
        trafficSource: 'facebook',
      };

      mockEventViewRepository.create.mockReturnValue(mockEventView);
      mockEventViewRepository.save.mockResolvedValue(mockEventView);

      await service.trackView(trackViewDto);

      expect(mockEventViewRepository.create).toHaveBeenCalledWith({
        ...trackViewDto,
        trafficSource: 'facebook',
      });
    });

    it('should default to direct traffic when no referrer', async () => {
      const trackViewDto: TrackViewDto = {
        eventId: 'event-123',
        userId: 'user-456',
      };

      const mockEventView = {
        id: 'view-123',
        ...trackViewDto,
        trafficSource: 'direct',
      };

      mockEventViewRepository.create.mockReturnValue(mockEventView);
      mockEventViewRepository.save.mockResolvedValue(mockEventView);

      await service.trackView(trackViewDto);

      expect(mockEventViewRepository.create).toHaveBeenCalledWith({
        ...trackViewDto,
        trafficSource: 'direct',
      });
    });
  });

  describe('trackPurchase', () => {
    it('should track purchase successfully', async () => {
      const trackPurchaseDto: TrackPurchaseDto = {
        eventId: 'event-123',
        purchaserId: 'user-456',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 2,
        unitPrice: 100,
        totalAmount: 200,
        status: 'completed',
        trafficSource: 'email',
        paymentMethod: 'credit_card',
        transactionId: 'txn-123',
      };

      const mockPurchaseLog = {
        id: 'purchase-123',
        ...trackPurchaseDto,
        completedAt: expect.any(Date),
      };

      mockPurchaseLogRepository.create.mockReturnValue(mockPurchaseLog);
      mockPurchaseLogRepository.save.mockResolvedValue(mockPurchaseLog);
      mockEventViewRepository.update.mockResolvedValue({ affected: 1 });

      await service.trackPurchase(trackPurchaseDto, '192.168.1.1');

      expect(mockPurchaseLogRepository.create).toHaveBeenCalledWith({
        ...trackPurchaseDto,
        ipAddress: '192.168.1.1',
        trafficSource: 'email',
        completedAt: expect.any(Date),
      });
      expect(mockPurchaseLogRepository.save).toHaveBeenCalledWith(
        mockPurchaseLog,
      );
      expect(mockEventViewRepository.update).toHaveBeenCalled();
    });

    it('should not set completedAt for failed purchases', async () => {
      const trackPurchaseDto: TrackPurchaseDto = {
        eventId: 'event-123',
        purchaserId: 'user-456',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 1,
        unitPrice: 100,
        totalAmount: 100,
        status: 'failed',
      };

      const mockPurchaseLog = {
        id: 'purchase-123',
        ...trackPurchaseDto,
        completedAt: null,
      };

      mockPurchaseLogRepository.create.mockReturnValue(mockPurchaseLog);
      mockPurchaseLogRepository.save.mockResolvedValue(mockPurchaseLog);

      await service.trackPurchase(trackPurchaseDto);

      expect(mockPurchaseLogRepository.create).toHaveBeenCalledWith({
        ...trackPurchaseDto,
        trafficSource: 'direct',
        completedAt: null,
      });
    });
  });

  describe('trackEngagement', () => {
    it('should track engagement successfully', async () => {
      const trackEngagementDto: TrackEngagementDto = {
        eventId: 'event-123',
        userId: 'user-456',
        engagementType: EngagementType.SHARE,
        metadata: { platform: 'twitter' },
        trafficSource: 'social',
      };

      const mockEngagement = {
        id: 'engagement-123',
        ...trackEngagementDto,
        ipAddress: '192.168.1.1',
      };

      mockEventEngagementRepository.create.mockReturnValue(mockEngagement);
      mockEventEngagementRepository.save.mockResolvedValue(mockEngagement);

      await service.trackEngagement(trackEngagementDto, '192.168.1.1');

      expect(mockEventEngagementRepository.create).toHaveBeenCalledWith({
        ...trackEngagementDto,
        ipAddress: '192.168.1.1',
        trafficSource: 'social',
      });
      expect(mockEventEngagementRepository.save).toHaveBeenCalledWith(
        mockEngagement,
      );
    });
  });

  describe('parseUserAgent', () => {
    it('should parse Chrome on Windows desktop', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

      const result = service.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('desktop');
      expect(result.browser).toBe('chrome');
      expect(result.operatingSystem).toBe('windows');
    });

    it('should parse Safari on iOS mobile', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

      const result = service.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('mobile');
      expect(result.browser).toBe('safari');
      expect(result.operatingSystem).toBe('ios');
    });

    it('should parse Firefox on Linux desktop', () => {
      const userAgent =
        'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0';

      const result = service.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('desktop');
      expect(result.browser).toBe('firefox');
      expect(result.operatingSystem).toBe('linux');
    });

    it('should handle iPad as tablet', () => {
      const userAgent =
        'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

      const result = service.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('tablet');
      expect(result.browser).toBe('safari');
      expect(result.operatingSystem).toBe('ios');
    });
  });

  describe('traffic source normalization', () => {
    it('should identify social media sources', () => {
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://facebook.com/page',
        ),
      ).toBe('facebook');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://twitter.com/user',
        ),
      ).toBe('twitter');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://linkedin.com/in/user',
        ),
      ).toBe('linkedin');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://instagram.com/user',
        ),
      ).toBe('instagram');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://youtube.com/watch',
        ),
      ).toBe('youtube');
    });

    it('should identify search engines', () => {
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://google.com/search',
        ),
      ).toBe('google');
      expect(
        service['normalizeTrafficSource'](undefined, 'https://bing.com/search'),
      ).toBe('bing');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://yahoo.com/search',
        ),
      ).toBe('yahoo');
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://duckduckgo.com/search',
        ),
      ).toBe('duckduckgo');
    });

    it('should identify email sources', () => {
      expect(
        service['normalizeTrafficSource'](undefined, 'https://gmail.com'),
      ).toBe('email');
      expect(
        service['normalizeTrafficSource'](undefined, 'https://outlook.com'),
      ).toBe('email');
    });

    it('should default to referral for unknown sources', () => {
      expect(
        service['normalizeTrafficSource'](
          undefined,
          'https://unknown-site.com',
        ),
      ).toBe('referral');
    });

    it('should use provided traffic source when available', () => {
      expect(
        service['normalizeTrafficSource']('paid', 'https://google.com'),
      ).toBe('paid');
    });

    it('should default to direct when no referrer', () => {
      expect(service['normalizeTrafficSource']()).toBe('direct');
    });
  });
});
