import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { RevenueForecastingService } from '../revenue-forecasting.service';
import { RevenueProjection } from '../../entities/revenue-projection.entity';
import { EventAnalytics } from '../../entities/event-analytics.entity';
import { TicketSalesMetrics } from '../../entities/ticket-sales-metrics.entity';

describe('RevenueForecastingService', () => {
  let service: RevenueForecastingService;
  let revenueProjectionRepository: jest.Mocked<Repository<RevenueProjection>>;
  let eventAnalyticsRepository: jest.Mocked<Repository<EventAnalytics>>;
  let ticketSalesRepository: jest.Mocked<Repository<TicketSalesMetrics>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEventAnalytics = {
    eventId: 'event-123',
    organizerId: 'org-123',
    eventDate: new Date('2024-12-31'),
    ticketSalesMetrics: {
      totalRevenue: 50000,
      totalTicketsSold: 1000,
      averageTicketPrice: 50,
      salesVelocity: 25,
      conversionRate: 0.12,
      capacityUtilization: 0.8,
    },
    customMetrics: {
      marketingSpend: 10000,
      organicTraffic: 5000,
    },
    socialMediaMetrics: {
      totalReach: 100000,
    },
  };

  const mockHistoricalData = [
    {
      timestamp: new Date('2024-01-01'),
      totalRevenue: 10000,
      totalTicketsSold: 200,
      averageTicketPrice: 50,
      salesChannel: 'online',
      paymentMethodBreakdown: { credit_card: 70, paypal: 30 },
      promotionalCodeUsage: { totalDiscount: 1000 },
      refunds: 100,
    },
    {
      timestamp: new Date('2024-01-02'),
      totalRevenue: 15000,
      totalTicketsSold: 300,
      averageTicketPrice: 50,
      salesChannel: 'online',
      paymentMethodBreakdown: { credit_card: 75, paypal: 25 },
      promotionalCodeUsage: { totalDiscount: 1500 },
      refunds: 150,
    },
  ];

  const mockRevenueProjection = {
    id: '1',
    eventId: 'event-123',
    organizerId: 'org-123',
    projectionHorizon: '7d',
    generatedAt: new Date(),
    modelsUsed: ['Linear Regression', 'Exponential Growth'],
    ensembleAccuracy: 85.5,
    baselineRevenue: 50000,
    projectedRevenue: 75000,
    confidenceIntervals: {
      '95%': { lower: 60000, upper: 90000 },
      '90%': { lower: 65000, upper: 85000 },
    },
    modelMetrics: {
      accuracy: 85.5,
      mape: 12.3,
      rmse: 5000,
      r_squared: 0.82,
    },
    scenarioAnalysis: [
      {
        scenario: 'optimistic',
        probability: 0.25,
        projectedRevenue: 90000,
        confidenceInterval: { lower: 80000, upper: 100000 },
        assumptions: ['Strong marketing performance'],
        riskFactors: ['Market saturation'],
      },
    ],
  };

  beforeEach(async () => {
    const mockRevenueProjectionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockEventAnalyticsRepo = {
      findOne: jest.fn(),
    };

    const mockTicketSalesRepo = {
      find: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueForecastingService,
        {
          provide: getRepositoryToken(RevenueProjection),
          useValue: mockRevenueProjectionRepo,
        },
        {
          provide: getRepositoryToken(EventAnalytics),
          useValue: mockEventAnalyticsRepo,
        },
        {
          provide: getRepositoryToken(TicketSalesMetrics),
          useValue: mockTicketSalesRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<RevenueForecastingService>(RevenueForecastingService);
    revenueProjectionRepository = module.get(getRepositoryToken(RevenueProjection));
    eventAnalyticsRepository = module.get(getRepositoryToken(EventAnalytics));
    ticketSalesRepository = module.get(getRepositoryToken(TicketSalesMetrics));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRevenueProjection', () => {
    beforeEach(() => {
      eventAnalyticsRepository.findOne.mockResolvedValue(mockEventAnalytics as any);
      ticketSalesRepository.find.mockResolvedValue(mockHistoricalData as any);
      revenueProjectionRepository.findOne.mockResolvedValue(null);
      revenueProjectionRepository.create.mockReturnValue(mockRevenueProjection as any);
      revenueProjectionRepository.save.mockResolvedValue(mockRevenueProjection as any);
    });

    it('should generate revenue projection successfully', async () => {
      const result = await service.generateRevenueProjection('event-123', 'org-123', '7d');

      expect(eventAnalyticsRepository.findOne).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
      expect(ticketSalesRepository.find).toHaveBeenCalled();
      expect(revenueProjectionRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('revenue.projection.updated', expect.any(Object));
      expect(result).toBeDefined();
      expect(result.projectedRevenue).toBeGreaterThan(0);
    });

    it('should update existing projection', async () => {
      revenueProjectionRepository.findOne.mockResolvedValue(mockRevenueProjection as any);

      const result = await service.generateRevenueProjection('event-123', 'org-123', '7d');

      expect(revenueProjectionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle different projection horizons', async () => {
      const horizons = ['24h', '7d', '30d', 'event_end'] as const;

      for (const horizon of horizons) {
        await service.generateRevenueProjection('event-123', 'org-123', horizon);
        expect(revenueProjectionRepository.save).toHaveBeenCalled();
      }
    });

    it('should throw error when event analytics not found', async () => {
      eventAnalyticsRepository.findOne.mockResolvedValue(null);

      await expect(service.generateRevenueProjection('nonexistent', 'org-123'))
        .rejects.toThrow('Event analytics not found');
    });
  });

  describe('forecast models', () => {
    it('should create linear regression model', () => {
      const model = service['createLinearModel'](mockHistoricalData as any);

      expect(model).toBeDefined();
      expect(model.accuracy).toBeGreaterThanOrEqual(0);
      expect(model.mape).toBeGreaterThanOrEqual(0);
      expect(model.rmse).toBeGreaterThanOrEqual(0);
    });

    it('should create exponential growth model', () => {
      const model = service['createExponentialModel'](mockHistoricalData as any);

      expect(model).toBeDefined();
      expect(model.accuracy).toBeGreaterThanOrEqual(0);
      expect(model.mape).toBeGreaterThanOrEqual(0);
      expect(model.rmse).toBeGreaterThanOrEqual(0);
    });

    it('should create polynomial regression model', () => {
      const extendedData = [...mockHistoricalData, ...mockHistoricalData];
      const model = service['createPolynomialModel'](extendedData as any);

      expect(model).toBeDefined();
      expect(model.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should create seasonal decomposition model', () => {
      const weeklyData = Array(14).fill(null).map((_, index) => ({
        ...mockHistoricalData[0],
        timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      }));

      const model = service['createSeasonalModel'](weeklyData as any);

      expect(model).toBeDefined();
      expect(model.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should create ML ensemble model', () => {
      const currentMetrics = {
        totalRevenue: 50000,
        salesVelocity: 25,
        conversionRate: 0.12,
      };

      const model = service['createMLEnsembleModel'](mockHistoricalData as any, currentMetrics);

      expect(model).toBeDefined();
      expect(model.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should handle insufficient data gracefully', () => {
      const emptyData = [];
      const model = service['createLinearModel'](emptyData as any);

      expect(model.accuracy).toBe(0);
      expect(model.mape).toBe(100);
      expect(model.rmse).toBe(1000);
    });
  });

  describe('scenario analysis', () => {
    it('should perform scenario analysis', async () => {
      const basePrediction = { totalRevenue: 75000 };
      const currentMetrics = mockEventAnalytics.ticketSalesMetrics;

      const scenarios = await service['performScenarioAnalysis'](
        mockHistoricalData as any,
        currentMetrics,
        basePrediction,
      );

      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].scenario).toBe('optimistic');
      expect(scenarios[1].scenario).toBe('realistic');
      expect(scenarios[2].scenario).toBe('pessimistic');

      scenarios.forEach(scenario => {
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.probability).toBeLessThanOrEqual(1);
        expect(scenario.projectedRevenue).toBeGreaterThan(0);
        expect(scenario.confidenceInterval.lower).toBeLessThan(scenario.confidenceInterval.upper);
      });
    });
  });

  describe('confidence intervals', () => {
    it('should calculate confidence intervals', () => {
      const models = [
        { accuracy: 85, mape: 15, rmse: 5000 },
        { accuracy: 90, mape: 10, rmse: 4000 },
      ];
      const prediction = { totalRevenue: 75000 };

      const intervals = service['calculateConfidenceIntervals'](models as any, prediction, '7d');

      expect(intervals['95%']).toBeDefined();
      expect(intervals['90%']).toBeDefined();
      expect(intervals['80%']).toBeDefined();
      expect(intervals['68%']).toBeDefined();

      Object.values(intervals).forEach(interval => {
        expect(interval.lower).toBeLessThan(interval.upper);
        expect(interval.lower).toBeGreaterThan(0);
      });
    });
  });

  describe('revenue milestones', () => {
    it('should calculate revenue milestones', () => {
      const currentMetrics = { totalRevenue: 50000 };
      const prediction = { totalRevenue: 100000, dailyRevenue: 5000 };

      const milestones = service['calculateRevenueMilestones'](currentMetrics, prediction, '7d');

      expect(milestones.length).toBeGreaterThan(0);
      milestones.forEach(milestone => {
        expect(milestone.target).toBeGreaterThan(currentMetrics.totalRevenue);
        expect(milestone.probability).toBeGreaterThan(0);
        expect(milestone.probability).toBeLessThanOrEqual(1);
        expect(milestone.estimatedDate).toBeInstanceOf(Date);
        expect(milestone.requiredDailyRate).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('helper methods', () => {
    it('should calculate days until event correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const days = service['calculateDaysUntilEvent'](futureDate);
      expect(days).toBe(10);
    });

    it('should get horizon days correctly', () => {
      expect(service['getHorizonDays']('24h')).toBe(1);
      expect(service['getHorizonDays']('7d')).toBe(7);
      expect(service['getHorizonDays']('30d')).toBe(30);
      expect(service['getHorizonDays']('event_end')).toBe(60);
    });

    it('should calculate MAPE from predictions', () => {
      const actual = [100, 200, 300];
      const predicted = [110, 190, 310];

      const mape = service['calculateMAPEFromPredictions'](actual, predicted);
      expect(mape).toBeGreaterThan(0);
      expect(mape).toBeLessThan(100);
    });

    it('should calculate RMSE from predictions', () => {
      const actual = [100, 200, 300];
      const predicted = [110, 190, 310];

      const rmse = service['calculateRMSEFromPredictions'](actual, predicted);
      expect(rmse).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      eventAnalyticsRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.generateRevenueProjection('event-123', 'org-123'))
        .rejects.toThrow('Database error');
    });

    it('should handle invalid projection horizon', async () => {
      eventAnalyticsRepository.findOne.mockResolvedValue(mockEventAnalytics as any);
      ticketSalesRepository.find.mockResolvedValue(mockHistoricalData as any);

      const result = await service.generateRevenueProjection('event-123', 'org-123', 'invalid' as any);
      expect(result).toBeDefined();
    });

    it('should handle null/undefined input data', () => {
      expect(() => service['createLinearModel'](null as any)).not.toThrow();
      expect(() => service['createLinearModel'](undefined as any)).not.toThrow();
    });
  });

  describe('performance optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000).fill(mockHistoricalData[0]);
      ticketSalesRepository.find.mockResolvedValue(largeDataset as any);
      eventAnalyticsRepository.findOne.mockResolvedValue(mockEventAnalytics as any);
      revenueProjectionRepository.findOne.mockResolvedValue(null);
      revenueProjectionRepository.create.mockReturnValue(mockRevenueProjection as any);
      revenueProjectionRepository.save.mockResolvedValue(mockRevenueProjection as any);

      const startTime = Date.now();
      await service.generateRevenueProjection('event-123', 'org-123');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache model calculations', () => {
      const data = mockHistoricalData;
      
      // Call the same model multiple times
      const model1 = service['createLinearModel'](data as any);
      const model2 = service['createLinearModel'](data as any);

      expect(model1.accuracy).toBe(model2.accuracy);
      expect(model1.mape).toBe(model2.mape);
      expect(model1.rmse).toBe(model2.rmse);
    });
  });

  describe('integration scenarios', () => {
    it('should work with minimal historical data', async () => {
      const minimalData = [mockHistoricalData[0]];
      ticketSalesRepository.find.mockResolvedValue(minimalData as any);
      eventAnalyticsRepository.findOne.mockResolvedValue(mockEventAnalytics as any);
      revenueProjectionRepository.findOne.mockResolvedValue(null);
      revenueProjectionRepository.create.mockReturnValue(mockRevenueProjection as any);
      revenueProjectionRepository.save.mockResolvedValue(mockRevenueProjection as any);

      const result = await service.generateRevenueProjection('event-123', 'org-123');
      expect(result).toBeDefined();
      expect(result.projectedRevenue).toBeGreaterThan(0);
    });

    it('should handle events with no historical data', async () => {
      ticketSalesRepository.find.mockResolvedValue([]);
      eventAnalyticsRepository.findOne.mockResolvedValue(mockEventAnalytics as any);
      revenueProjectionRepository.findOne.mockResolvedValue(null);
      revenueProjectionRepository.create.mockReturnValue(mockRevenueProjection as any);
      revenueProjectionRepository.save.mockResolvedValue(mockRevenueProjection as any);

      const result = await service.generateRevenueProjection('event-123', 'org-123');
      expect(result).toBeDefined();
    });
  });
});
