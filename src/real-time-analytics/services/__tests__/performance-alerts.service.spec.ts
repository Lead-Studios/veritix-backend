import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { PerformanceAlertsService } from '../performance-alerts.service';
import { EventAnalytics } from '../../entities/event-analytics.entity';

describe('PerformanceAlertsService', () => {
  let service: PerformanceAlertsService;
  let eventAnalyticsRepository: jest.Mocked<Repository<EventAnalytics>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEventAnalytics = {
    eventId: 'event-123',
    organizerId: 'org-123',
    eventName: 'Test Event',
    eventDate: new Date('2024-12-31'),
    ticketSalesMetrics: {
      salesVelocity: 25,
      conversionRate: 0.12,
      capacityUtilization: 0.8,
      totalRevenue: 50000,
      totalTicketsSold: 1000,
      averageTicketPrice: 50,
      refunds: 50,
    },
    socialMediaMetrics: {
      overallSentiment: 0.7,
    },
    revenueProjections: {
      projectedRevenue: 60000,
    },
    alerts: [],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const mockEventAnalyticsRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceAlertsService,
        {
          provide: getRepositoryToken(EventAnalytics),
          useValue: mockEventAnalyticsRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PerformanceAlertsService>(PerformanceAlertsService);
    eventAnalyticsRepository = module.get(getRepositoryToken(EventAnalytics));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateEventAlerts', () => {
    it('should evaluate alerts for an event', async () => {
      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(mockEventAnalytics as any);

      // Should not trigger alerts for normal metrics
      expect(spy).not.toHaveBeenCalled();
    });

    it('should trigger sales velocity drop alert', async () => {
      const lowVelocityEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          salesVelocity: 20, // Below threshold of 30
        },
      };

      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(lowVelocityEvent as any);

      expect(spy).toHaveBeenCalledWith(
        'event-123',
        'org-123',
        expect.objectContaining({ name: 'Sales Velocity Drop' }),
        20,
        lowVelocityEvent,
      );
    });

    it('should trigger low conversion rate alert', async () => {
      const lowConversionEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          conversionRate: 0.03, // Below threshold of 0.05
        },
      };

      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(lowConversionEvent as any);

      expect(spy).toHaveBeenCalledWith(
        'event-123',
        'org-123',
        expect.objectContaining({ name: 'Low Conversion Rate' }),
        0.03,
        lowConversionEvent,
      );
    });

    it('should trigger capacity warning alert', async () => {
      const highCapacityEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          capacityUtilization: 0.96, // Above threshold of 0.95
        },
      };

      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(highCapacityEvent as any);

      expect(spy).toHaveBeenCalledWith(
        'event-123',
        'org-123',
        expect.objectContaining({ name: 'Capacity Warning' }),
        0.96,
        highCapacityEvent,
      );
    });

    it('should trigger sentiment decline alert', async () => {
      const lowSentimentEvent = {
        ...mockEventAnalytics,
        socialMediaMetrics: {
          overallSentiment: 0.4, // Below threshold of 0.5
        },
      };

      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(lowSentimentEvent as any);

      expect(spy).toHaveBeenCalledWith(
        'event-123',
        'org-123',
        expect.objectContaining({ name: 'Sentiment Decline' }),
        0.4,
        lowSentimentEvent,
      );
    });
  });

  describe('generateRecommendations', () => {
    it('should generate sales velocity recommendations', async () => {
      const lowVelocityEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          salesVelocity: 30,
        },
      };

      const recommendations = await service['generateRecommendations'](lowVelocityEvent as any);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'optimization',
          category: 'marketing',
          title: 'Boost Sales Velocity',
        })
      );
    });

    it('should generate pricing optimization recommendations', async () => {
      const lowConversionEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          conversionRate: 0.06,
        },
      };

      const recommendations = await service['generateRecommendations'](lowConversionEvent as any);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'optimization',
          category: 'pricing',
          title: 'Optimize Ticket Pricing',
        })
      );
    });

    it('should generate capacity opportunity recommendations', async () => {
      const highCapacityEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          capacityUtilization: 0.92,
        },
      };

      const recommendations = await service['generateRecommendations'](highCapacityEvent as any);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'opportunity',
          category: 'operations',
          title: 'High Demand Opportunity',
        })
      );
    });

    it('should generate sentiment warning recommendations', async () => {
      const lowSentimentEvent = {
        ...mockEventAnalytics,
        socialMediaMetrics: {
          overallSentiment: 0.55,
        },
      };

      const recommendations = await service['generateRecommendations'](lowSentimentEvent as any);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          category: 'marketing',
          title: 'Address Social Media Sentiment',
        })
      );
    });
  });

  describe('alert management', () => {
    it('should acknowledge alert', async () => {
      const alertId = 'alert-123';
      const userId = 'user-456';

      // Mock an active alert
      service['activeAlerts'].set(alertId, {
        id: alertId,
        eventId: 'event-123',
        organizerId: 'org-123',
        alertType: 'test',
        severity: 'medium',
        title: 'Test Alert',
        message: 'Test message',
        currentValue: 100,
        threshold: 50,
        recommendations: [],
        actionItems: [],
        triggeredAt: new Date(),
        acknowledged: false,
      });

      await service.acknowledgeAlert(alertId, userId);

      const alert = service['activeAlerts'].get(alertId);
      expect(alert?.acknowledged).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.alert.acknowledged', {
        alertId,
        userId,
        timestamp: expect.any(Date),
      });
    });

    it('should resolve alert', async () => {
      const alertId = 'alert-123';
      const userId = 'user-456';

      // Mock an active alert
      service['activeAlerts'].set(alertId, {
        id: alertId,
        eventId: 'event-123',
        organizerId: 'org-123',
        alertType: 'test',
        severity: 'medium',
        title: 'Test Alert',
        message: 'Test message',
        currentValue: 100,
        threshold: 50,
        recommendations: [],
        actionItems: [],
        triggeredAt: new Date(),
        acknowledged: false,
      });

      await service.resolveAlert(alertId, userId);

      expect(service['activeAlerts'].has(alertId)).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.alert.resolved', {
        alertId,
        userId,
        timestamp: expect.any(Date),
      });
    });

    it('should get active alerts for event', async () => {
      const eventId = 'event-123';
      const alert1 = {
        id: 'alert-1',
        eventId,
        organizerId: 'org-123',
        alertType: 'test1',
        severity: 'medium' as const,
        title: 'Test Alert 1',
        message: 'Test message 1',
        currentValue: 100,
        threshold: 50,
        recommendations: [],
        actionItems: [],
        triggeredAt: new Date(),
        acknowledged: false,
      };

      const alert2 = {
        id: 'alert-2',
        eventId: 'other-event',
        organizerId: 'org-123',
        alertType: 'test2',
        severity: 'high' as const,
        title: 'Test Alert 2',
        message: 'Test message 2',
        currentValue: 200,
        threshold: 100,
        recommendations: [],
        actionItems: [],
        triggeredAt: new Date(),
        acknowledged: false,
      };

      service['activeAlerts'].set('alert-1', alert1);
      service['activeAlerts'].set('alert-2', alert2);

      const alerts = await service.getActiveAlertsForEvent(eventId);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert-1');
    });
  });

  describe('alert rule management', () => {
    it('should add custom alert rule', async () => {
      const rule = {
        name: 'Custom Rule',
        metric: 'customMetric',
        condition: 'greater_than' as const,
        threshold: 100,
        severity: 'medium' as const,
        enabled: true,
        cooldownMinutes: 60,
      };

      const ruleId = await service.addCustomAlertRule(rule);

      expect(ruleId).toMatch(/^custom_\d+$/);
      expect(service['alertRules']).toContainEqual(
        expect.objectContaining({
          id: ruleId,
          name: 'Custom Rule',
        })
      );
    });

    it('should update alert rule', async () => {
      const ruleId = 'sales_velocity_drop';
      const updates = { threshold: 25, enabled: false };

      await service.updateAlertRule(ruleId, updates);

      const rule = service['alertRules'].find(r => r.id === ruleId);
      expect(rule?.threshold).toBe(25);
      expect(rule?.enabled).toBe(false);
    });

    it('should delete alert rule', async () => {
      const initialRuleCount = service['alertRules'].length;
      const ruleId = 'sales_velocity_drop';

      await service.deleteAlertRule(ruleId);

      expect(service['alertRules']).toHaveLength(initialRuleCount - 1);
      expect(service['alertRules'].find(r => r.id === ruleId)).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    it('should extract metric values correctly', () => {
      const value = service['extractMetricValue'](mockEventAnalytics as any, 'salesVelocity');
      expect(value).toBe(25);
    });

    it('should calculate revenue gap correctly', () => {
      const ticketMetrics = { totalRevenue: 40000 };
      const revenueProjection = { projectedRevenue: 50000 };

      const gap = service['calculateRevenueGap'](ticketMetrics, revenueProjection);
      expect(gap).toBe(0.2); // 20% gap
    });

    it('should calculate refund rate correctly', () => {
      const ticketMetrics = { totalTicketsSold: 1000, refunds: 50 };

      const rate = service['calculateRefundRate'](ticketMetrics);
      expect(rate).toBe(0.05); // 5% refund rate
    });

    it('should evaluate conditions correctly', () => {
      const rule = {
        condition: 'greater_than' as const,
        threshold: 50,
      };

      expect(service['evaluateCondition'](60, rule as any)).toBe(true);
      expect(service['evaluateCondition'](40, rule as any)).toBe(false);
    });

    it('should check cooldown correctly', () => {
      const rule = {
        cooldownMinutes: 60,
        lastTriggered: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      expect(service['isInCooldown'](rule as any)).toBe(true);

      rule.lastTriggered = new Date(Date.now() - 90 * 60 * 1000); // 90 minutes ago
      expect(service['isInCooldown'](rule as any)).toBe(false);
    });
  });

  describe('checkPerformanceAlerts scheduled task', () => {
    it('should check alerts for all active events', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockEventAnalytics]);
      const spy = jest.spyOn(service, 'evaluateEventAlerts').mockResolvedValue(undefined);

      await service.checkPerformanceAlerts();

      expect(eventAnalyticsRepository.createQueryBuilder).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(mockEventAnalytics);
    });

    it('should handle errors gracefully', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.checkPerformanceAlerts()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing event analytics gracefully', async () => {
      const incompleteEvent = {
        eventId: 'event-123',
        organizerId: 'org-123',
      };

      await expect(service.evaluateEventAlerts(incompleteEvent as any))
        .resolves.not.toThrow();
    });

    it('should handle database errors in alert updates', async () => {
      eventAnalyticsRepository.update.mockRejectedValue(new Error('Update failed'));

      const alert = {
        id: 'alert-123',
        eventId: 'event-123',
        organizerId: 'org-123',
        alertType: 'test',
        severity: 'medium' as const,
        title: 'Test Alert',
        message: 'Test message',
        currentValue: 100,
        threshold: 50,
        recommendations: [],
        actionItems: [],
        triggeredAt: new Date(),
        acknowledged: false,
      };

      await expect(service['updateEventAnalyticsWithAlert']('event-123', alert))
        .rejects.toThrow('Update failed');
    });
  });

  describe('performance', () => {
    it('should handle large numbers of alerts efficiently', async () => {
      const manyEvents = Array(100).fill(mockEventAnalytics);
      mockQueryBuilder.getMany.mockResolvedValue(manyEvents);

      const startTime = Date.now();
      await service.checkPerformanceAlerts();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should respect cooldown periods to avoid spam', async () => {
      const rule = service['alertRules'].find(r => r.id === 'sales_velocity_drop');
      if (rule) {
        rule.lastTriggered = new Date(); // Just triggered
      }

      const lowVelocityEvent = {
        ...mockEventAnalytics,
        ticketSalesMetrics: {
          ...mockEventAnalytics.ticketSalesMetrics,
          salesVelocity: 20,
        },
      };

      const spy = jest.spyOn(service as any, 'triggerAlert').mockResolvedValue(undefined);
      
      await service.evaluateEventAlerts(lowVelocityEvent as any);

      expect(spy).not.toHaveBeenCalled(); // Should be in cooldown
    });
  });
});
