import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../analytics.service';
import { EmailCampaign } from '../../entities/email-campaign.entity';
import { EmailDelivery, DeliveryStatus } from '../../entities/email-delivery.entity';
import { EmailOpen } from '../../entities/email-open.entity';
import { EmailClick } from '../../entities/email-click.entity';
import { EmailBounce } from '../../entities/email-bounce.entity';
import { AutomationWorkflow } from '../../entities/automation-workflow.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let campaignRepository: jest.Mocked<Repository<EmailCampaign>>;
  let deliveryRepository: jest.Mocked<Repository<EmailDelivery>>;
  let openRepository: jest.Mocked<Repository<EmailOpen>>;
  let clickRepository: jest.Mocked<Repository<EmailClick>>;
  let bounceRepository: jest.Mocked<Repository<EmailBounce>>;
  let workflowRepository: jest.Mocked<Repository<AutomationWorkflow>>;

  const mockCampaign = {
    id: '1',
    name: 'Test Campaign',
    status: 'sent',
    recipientCount: 100,
  };

  const mockWorkflow = {
    id: '1',
    name: 'Test Workflow',
    executionCount: 50,
    triggers: [
      { id: '1', triggerType: 'event', executionCount: 25, lastExecutedAt: new Date() }
    ],
    actions: [
      { id: '1', actionType: 'send_email', executionCount: 20, errorCount: 2, lastExecutedAt: new Date() }
    ],
  };

  beforeEach(async () => {
    const mockCampaignRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockDeliveryRepository = {
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockOpenRepository = {
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockClickRepository = {
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockBounceRepository = {
      count: jest.fn(),
    };

    const mockWorkflowRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(EmailCampaign),
          useValue: mockCampaignRepository,
        },
        {
          provide: getRepositoryToken(EmailDelivery),
          useValue: mockDeliveryRepository,
        },
        {
          provide: getRepositoryToken(EmailOpen),
          useValue: mockOpenRepository,
        },
        {
          provide: getRepositoryToken(EmailClick),
          useValue: mockClickRepository,
        },
        {
          provide: getRepositoryToken(EmailBounce),
          useValue: mockBounceRepository,
        },
        {
          provide: getRepositoryToken(AutomationWorkflow),
          useValue: mockWorkflowRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    campaignRepository = module.get(getRepositoryToken(EmailCampaign));
    deliveryRepository = module.get(getRepositoryToken(EmailDelivery));
    openRepository = module.get(getRepositoryToken(EmailOpen));
    clickRepository = module.get(getRepositoryToken(EmailClick));
    bounceRepository = module.get(getRepositoryToken(EmailBounce));
    workflowRepository = module.get(getRepositoryToken(AutomationWorkflow));
  });

  describe('getCampaignAnalytics', () => {
    it('should return comprehensive campaign analytics', async () => {
      campaignRepository.findOne.mockResolvedValue(mockCampaign as any);

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

      // Mock time series data
      jest.spyOn(service as any, 'getTimeSeriesData').mockResolvedValue([
        { date: '2023-01-01', opens: 10, clicks: 3, bounces: 1 },
        { date: '2023-01-02', opens: 15, clicks: 5, bounces: 0 },
      ]);

      // Mock device breakdown
      jest.spyOn(service as any, 'getDeviceBreakdown').mockResolvedValue([
        { deviceType: 'desktop', opens: 20, clicks: 8, percentage: 66.7 },
        { deviceType: 'mobile', opens: 10, clicks: 2, percentage: 33.3 },
      ]);

      // Mock location breakdown
      jest.spyOn(service as any, 'getLocationBreakdown').mockResolvedValue([
        { location: 'US', opens: 20, clicks: 6, percentage: 66.7 },
        { location: 'UK', opens: 10, clicks: 4, percentage: 33.3 },
      ]);

      // Mock link performance
      jest.spyOn(service as any, 'getLinkPerformance').mockResolvedValue([
        { url: 'https://example.com/cta', clicks: 8, uniqueClicks: 6, clickRate: 6.3 },
        { url: 'https://example.com/learn-more', clicks: 2, uniqueClicks: 2, clickRate: 2.1 },
      ]);

      const result = await service.getCampaignAnalytics('1');

      expect(result.overview).toEqual({
        sent: 100,
        delivered: 95,
        bounced: 5,
        opened: 30,
        clicked: 10,
        unsubscribed: 2,
        openRate: (30 / 95) * 100,
        clickRate: (10 / 95) * 100,
        clickToOpenRate: (10 / 30) * 100,
        bounceRate: (5 / 100) * 100,
        unsubscribeRate: (2 / 95) * 100,
      });

      expect(result.timeSeriesData).toHaveLength(2);
      expect(result.deviceBreakdown).toHaveLength(2);
      expect(result.locationBreakdown).toHaveLength(2);
      expect(result.linkPerformance).toHaveLength(2);
    });

    it('should throw error when campaign not found', async () => {
      campaignRepository.findOne.mockResolvedValue(null);

      await expect(service.getCampaignAnalytics('999'))
        .rejects.toThrow('Campaign not found');
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics for date range', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      };

      campaignRepository.count
        .mockResolvedValueOnce(25) // total campaigns
        .mockResolvedValueOnce(5); // active campaigns

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSent: '1000',
          totalDelivered: '950',
          totalOpened: '250',
          totalClicked: '50',
        }),
      };

      deliveryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Mock top performing campaigns
      jest.spyOn(service as any, 'getTopPerformingCampaigns').mockResolvedValue([
        { id: '1', name: 'Campaign 1', openRate: 30, clickRate: 5, sent: 100 },
        { id: '2', name: 'Campaign 2', openRate: 25, clickRate: 4, sent: 200 },
      ]);

      // Mock recent activity
      jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([
        { type: 'campaign_sent', description: 'Campaign sent', timestamp: new Date() },
      ]);

      const result = await service.getDashboardMetrics(dateRange);

      expect(result).toEqual({
        totalCampaigns: 25,
        activeCampaigns: 5,
        totalEmailsSent: 1000,
        averageOpenRate: (250 / 950) * 100,
        averageClickRate: (50 / 950) * 100,
        totalRevenue: 0,
        topPerformingCampaigns: expect.any(Array),
        recentActivity: expect.any(Array),
      });
    });
  });

  describe('getAutomationAnalytics', () => {
    it('should return automation workflow analytics', async () => {
      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);

      const result = await service.getAutomationAnalytics('1');

      expect(result.overview).toEqual({
        totalExecutions: 50,
        successfulExecutions: Math.floor(50 * 0.95),
        failedExecutions: 50 - Math.floor(50 * 0.95),
        successRate: 95,
        averageExecutionTime: 1500,
      });

      expect(result.triggerPerformance).toHaveLength(1);
      expect(result.actionPerformance).toHaveLength(1);
      expect(result.conversionFunnel).toHaveLength(5);

      expect(result.actionPerformance[0]).toEqual({
        actionId: '1',
        actionType: 'send_email',
        executionCount: 20,
        errorCount: 2,
        successRate: ((20 - 2) / 20) * 100,
        averageExecutionTime: 800,
      });
    });

    it('should throw error when workflow not found', async () => {
      workflowRepository.findOne.mockResolvedValue(null);

      await expect(service.getAutomationAnalytics('999'))
        .rejects.toThrow('Workflow not found');
    });
  });

  describe('getSegmentAnalytics', () => {
    it('should return segment analytics', async () => {
      const result = await service.getSegmentAnalytics('segment-1');

      expect(result).toEqual({
        overview: {
          totalUsers: 1500,
          activeUsers: 1200,
          engagementRate: 80,
          averageOpenRate: 25.5,
          averageClickRate: 4.2,
        },
        campaignPerformance: [],
        userActivity: [],
      });
    });
  });

  describe('private methods', () => {
    describe('getTimeSeriesData', () => {
      it('should return time series data for date range', async () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-01-02');

        openRepository.count.mockResolvedValue(5);
        clickRepository.count.mockResolvedValue(2);
        bounceRepository.count.mockResolvedValue(1);

        const result = await (service as any).getTimeSeriesData('1', startDate, endDate);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          date: '2023-01-01',
          opens: 5,
          clicks: 2,
          bounces: 1,
        });
      });
    });

    describe('getDeviceBreakdown', () => {
      it('should return device breakdown data', async () => {
        const mockQueryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { deviceType: 'desktop', opens: '20' },
            { deviceType: 'mobile', opens: '10' },
          ]),
        };

        openRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await (service as any).getDeviceBreakdown('1');

        expect(result).toEqual([
          { deviceType: 'desktop', opens: 20, clicks: 0, percentage: 66.66666666666666 },
          { deviceType: 'mobile', opens: 10, clicks: 0, percentage: 33.33333333333333 },
        ]);
      });
    });

    describe('getLinkPerformance', () => {
      it('should return link performance data', async () => {
        const mockQueryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { url: 'https://example.com/cta', clicks: '10', uniqueClicks: '8' },
            { url: 'https://example.com/learn', clicks: '5', uniqueClicks: '4' },
          ]),
        };

        clickRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        deliveryRepository.count.mockResolvedValue(100);

        const result = await (service as any).getLinkPerformance('1');

        expect(result).toEqual([
          { url: 'https://example.com/cta', clicks: 10, uniqueClicks: 8, clickRate: 8 },
          { url: 'https://example.com/learn', clicks: 5, uniqueClicks: 4, clickRate: 4 },
        ]);
      });
    });
  });
});
