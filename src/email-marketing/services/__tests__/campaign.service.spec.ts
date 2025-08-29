import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignService } from '../campaign.service';
import { EmailCampaign, CampaignStatus, CampaignType } from '../../entities/email-campaign.entity';
import { CampaignSegment } from '../../entities/campaign-segment.entity';
import { EmailTemplate } from '../../entities/email-template.entity';
import { UserSegment } from '../../entities/user-segment.entity';
import { EmailDelivery, DeliveryStatus } from '../../entities/email-delivery.entity';

describe('CampaignService', () => {
  let service: CampaignService;
  let campaignRepository: jest.Mocked<Repository<EmailCampaign>>;
  let segmentRepository: jest.Mocked<Repository<CampaignSegment>>;
  let templateRepository: jest.Mocked<Repository<EmailTemplate>>;
  let userSegmentRepository: jest.Mocked<Repository<UserSegment>>;
  let deliveryRepository: jest.Mocked<Repository<EmailDelivery>>;

  const mockCampaign = {
    id: '1',
    name: 'Test Campaign',
    slug: 'test-campaign',
    campaignType: CampaignType.PROMOTIONAL,
    templateId: 'template-1',
    subject: 'Test Subject',
    status: CampaignStatus.DRAFT,
    recipientCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate = {
    id: 'template-1',
    name: 'Test Template',
    status: 'active',
  };

  const mockUserSegment = {
    id: 'segment-1',
    name: 'Test Segment',
    userCount: 100,
  };

  beforeEach(async () => {
    const mockCampaignRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockSegmentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockTemplateRepository = {
      findOne: jest.fn(),
    };

    const mockUserSegmentRepository = {
      findOne: jest.fn(),
    };

    const mockDeliveryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: getRepositoryToken(EmailCampaign),
          useValue: mockCampaignRepository,
        },
        {
          provide: getRepositoryToken(CampaignSegment),
          useValue: mockSegmentRepository,
        },
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(UserSegment),
          useValue: mockUserSegmentRepository,
        },
        {
          provide: getRepositoryToken(EmailDelivery),
          useValue: mockDeliveryRepository,
        },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    campaignRepository = module.get(getRepositoryToken(EmailCampaign));
    segmentRepository = module.get(getRepositoryToken(CampaignSegment));
    templateRepository = module.get(getRepositoryToken(EmailTemplate));
    userSegmentRepository = module.get(getRepositoryToken(UserSegment));
    deliveryRepository = module.get(getRepositoryToken(EmailDelivery));
  });

  describe('create', () => {
    it('should create a new campaign with segments', async () => {
      const createDto = {
        name: 'New Campaign',
        campaignType: CampaignType.PROMOTIONAL,
        templateId: 'template-1',
        subject: 'New Subject',
        segments: [{ segmentId: 'segment-1', isIncluded: true }],
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate as any);
      campaignRepository.findOne.mockResolvedValue(null); // No existing slug
      campaignRepository.create.mockReturnValue(mockCampaign as any);
      campaignRepository.save.mockResolvedValue(mockCampaign as any);
      userSegmentRepository.findOne.mockResolvedValue(mockUserSegment as any);
      segmentRepository.create.mockReturnValue({} as any);
      segmentRepository.save.mockResolvedValue([]);
      campaignRepository.findOne.mockResolvedValueOnce(mockCampaign as any); // For findOne call

      const result = await service.create(createDto as any);

      expect(templateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
      expect(campaignRepository.create).toHaveBeenCalled();
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      const createDto = {
        name: 'New Campaign',
        campaignType: CampaignType.PROMOTIONAL,
        templateId: 'invalid-template',
        subject: 'New Subject',
      };

      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update campaign status when transition is valid', async () => {
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.DRAFT,
      } as any);
      campaignRepository.save.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
      } as any);

      const result = await service.updateStatus('1', CampaignStatus.SCHEDULED);

      expect(result.status).toBe(CampaignStatus.SCHEDULED);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SENT,
      } as any);

      await expect(service.updateStatus('1', CampaignStatus.DRAFT))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule a draft campaign', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.DRAFT,
      } as any);
      campaignRepository.save.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
        scheduledAt: futureDate,
      } as any);

      const result = await service.scheduleCampaign('1', futureDate);

      expect(result.status).toBe(CampaignStatus.SCHEDULED);
      expect(result.scheduledAt).toBe(futureDate);
    });

    it('should throw BadRequestException when scheduling past date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.DRAFT,
      } as any);

      await expect(service.scheduleCampaign('1', pastDate))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('sendCampaign', () => {
    it('should send a draft campaign', async () => {
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.DRAFT,
      } as any);
      campaignRepository.save.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SENT,
      } as any);
      deliveryRepository.create.mockReturnValue({} as any);
      deliveryRepository.save.mockResolvedValue([]);

      // Mock getCampaignRecipients method
      jest.spyOn(service as any, 'getCampaignRecipients').mockResolvedValue([
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ]);

      const result = await service.sendCampaign('1');

      expect(result.status).toBe(CampaignStatus.SENT);
      expect(deliveryRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when campaign cannot be sent', async () => {
      campaignRepository.findOne.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SENT,
      } as any);

      await expect(service.sendCampaign('1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getCampaignStats', () => {
    it('should return campaign statistics', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          sent: '100',
          delivered: '95',
          bounced: '5',
          opened: '30',
          clicked: '10',
          unsubscribed: '2',
        }),
      };

      deliveryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCampaignStats('1');

      expect(result).toEqual({
        sent: 100,
        delivered: 95,
        bounced: 5,
        opened: 30,
        clicked: 10,
        unsubscribed: 2,
        openRate: (30 / 95) * 100,
        clickRate: (10 / 95) * 100,
        bounceRate: (5 / 100) * 100,
        unsubscribeRate: (2 / 95) * 100,
      });
    });
  });
});
