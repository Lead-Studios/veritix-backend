import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { WebhookService } from '../webhook.service';
import { Webhook, WebhookStatus } from '../../entities/webhook.entity';
import { WebhookDelivery, DeliveryStatus } from '../../entities/webhook-delivery.entity';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookRepository: Repository<Webhook>;
  let deliveryRepository: Repository<WebhookDelivery>;
  let httpService: HttpService;

  const mockWebhookRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockDeliveryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: mockDeliveryRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    webhookRepository = module.get<Repository<Webhook>>(getRepositoryToken(Webhook));
    deliveryRepository = module.get<Repository<WebhookDelivery>>(getRepositoryToken(WebhookDelivery));
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
    mockWebhookRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDeliveryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('create', () => {
    it('should create a new webhook', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        events: ['user.created', 'user.updated'],
        description: 'Test webhook',
        tenantId: 'tenant-1',
      };

      const mockWebhook = {
        id: '1',
        ...createDto,
        status: WebhookStatus.ACTIVE,
        secret: 'generated-secret',
        createdAt: new Date(),
      };

      mockWebhookRepository.create.mockReturnValue(mockWebhook);
      mockWebhookRepository.save.mockResolvedValue(mockWebhook);

      const result = await service.create(createDto);

      expect(mockWebhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: createDto.url,
          events: createDto.events,
          description: createDto.description,
          tenantId: createDto.tenantId,
          status: WebhookStatus.ACTIVE,
          secret: expect.any(String),
        })
      );
      expect(result).toEqual(mockWebhook);
    });
  });

  describe('trigger', () => {
    it('should trigger webhook for matching event', async () => {
      const mockWebhook = {
        id: '1',
        url: 'https://example.com/webhook',
        events: ['user.created'],
        status: WebhookStatus.ACTIVE,
        secret: 'test-secret',
        tenantId: 'tenant-1',
      } as Webhook;

      mockQueryBuilder.getMany.mockResolvedValue([mockWebhook]);
      
      const mockDelivery = {
        id: '1',
        status: DeliveryStatus.PENDING,
      };
      
      mockDeliveryRepository.create.mockReturnValue(mockDelivery);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      const mockResponse = {
        status: 200,
        data: { success: true },
        headers: { 'content-type': 'application/json' },
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResponse }));

      await service.trigger('user.created', { userId: '123' }, 'tenant-1');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        mockWebhook.url,
        { userId: '123' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.any(String),
          }),
          timeout: 30000,
        })
      );
    });

    it('should not trigger webhook for non-matching event', async () => {
      const mockWebhook = {
        id: '1',
        events: ['user.updated'],
        status: WebhookStatus.ACTIVE,
      } as Webhook;

      mockQueryBuilder.getMany.mockResolvedValue([mockWebhook]);

      await service.trigger('user.created', { userId: '123' }, 'tenant-1');

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe('executeDelivery', () => {
    it('should execute webhook delivery successfully', async () => {
      const mockWebhook = {
        id: '1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        timeout: 30000,
        headers: { 'Custom-Header': 'value' },
      } as Webhook;

      const mockDelivery = {
        id: '1',
        status: DeliveryStatus.PENDING,
        attempts: 0,
      };

      mockDeliveryRepository.create.mockReturnValue(mockDelivery);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      const mockResponse = {
        status: 200,
        data: { success: true },
        headers: { 'content-type': 'application/json' },
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResponse }));

      const result = await service.executeDelivery(mockWebhook, 'user.created', { userId: '123' });

      expect(result.status).toBe(DeliveryStatus.SUCCESS);
      expect(mockDeliveryRepository.save).toHaveBeenCalled();
    });

    it('should handle webhook delivery failure', async () => {
      const mockWebhook = {
        id: '1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
      } as Webhook;

      const mockDelivery = {
        id: '1',
        status: DeliveryStatus.PENDING,
        attempts: 0,
      };

      mockDeliveryRepository.create.mockReturnValue(mockDelivery);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      const error = new Error('Network error');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const result = await service.executeDelivery(mockWebhook, 'user.created', { userId: '123' });

      expect(result.status).toBe(DeliveryStatus.FAILED);
      expect(result.errorMessage).toBe('Network error');
      expect(mockDeliveryRepository.save).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('should activate a webhook', async () => {
      const mockWebhook = {
        id: '1',
        status: WebhookStatus.INACTIVE,
      } as Webhook;

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);
      mockWebhookRepository.save.mockResolvedValue({
        ...mockWebhook,
        status: WebhookStatus.ACTIVE,
      });

      const result = await service.activate('1');

      expect(result.status).toBe(WebhookStatus.ACTIVE);
      expect(mockWebhookRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhookRepository.findOne.mockResolvedValue(null);

      await expect(service.activate('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('test', () => {
    it('should test webhook delivery', async () => {
      const mockWebhook = {
        id: '1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
      } as Webhook;

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      const mockDelivery = {
        id: '1',
        status: DeliveryStatus.SUCCESS,
      };

      mockDeliveryRepository.create.mockReturnValue(mockDelivery);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      const mockResponse = {
        status: 200,
        data: { success: true },
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResponse }));

      const result = await service.test('1', 'test.event', { test: true });

      expect(result.status).toBe(DeliveryStatus.SUCCESS);
      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return webhook statistics', async () => {
      const mockWebhook = { id: '1' } as Webhook;
      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      const mockStats = {
        totalDeliveries: 100,
        successfulDeliveries: 95,
        failedDeliveries: 5,
        averageResponseTime: 250,
      };

      mockQueryBuilder.getOne.mockResolvedValue(mockStats);

      const result = await service.getStats('1', 30);

      expect(result).toBeDefined();
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('generateSignature', () => {
    it('should generate HMAC signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=/);
      expect(signature.length).toBeGreaterThan(10);
    });
  });

  describe('shouldTriggerWebhook', () => {
    it('should return true for matching event', () => {
      const webhook = {
        events: ['user.created', 'user.updated'],
        filters: {},
      } as Webhook;

      const result = service.shouldTriggerWebhook(webhook, 'user.created', {});

      expect(result).toBe(true);
    });

    it('should return false for non-matching event', () => {
      const webhook = {
        events: ['user.updated'],
        filters: {},
      } as Webhook;

      const result = service.shouldTriggerWebhook(webhook, 'user.created', {});

      expect(result).toBe(false);
    });

    it('should apply filters correctly', () => {
      const webhook = {
        events: ['user.created'],
        filters: { userType: 'premium' },
      } as Webhook;

      const matchingPayload = { userType: 'premium', userId: '123' };
      const nonMatchingPayload = { userType: 'basic', userId: '123' };

      expect(service.shouldTriggerWebhook(webhook, 'user.created', matchingPayload)).toBe(true);
      expect(service.shouldTriggerWebhook(webhook, 'user.created', nonMatchingPayload)).toBe(false);
    });
  });
});
