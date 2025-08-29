import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { TicketSalesTrackingService } from '../ticket-sales-tracking.service';
import { TicketSalesMetrics } from '../../entities/ticket-sales-metrics.entity';
import { EventAnalytics } from '../../entities/event-analytics.entity';

describe('TicketSalesTrackingService', () => {
  let service: TicketSalesTrackingService;
  let ticketSalesRepository: jest.Mocked<Repository<TicketSalesMetrics>>;
  let eventAnalyticsRepository: jest.Mocked<Repository<EventAnalytics>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTicketSale = {
    eventId: 'event-123',
    ticketId: 'ticket-456',
    quantity: 2,
    unitPrice: 50,
    totalPrice: 100,
    salesChannel: 'online',
    paymentMethod: 'credit_card',
    customerLocation: 'US',
    deviceType: 'desktop',
    timestamp: new Date(),
  };

  const mockTicketSalesMetrics = {
    id: '1',
    eventId: 'event-123',
    organizerId: 'org-123',
    timestamp: new Date(),
    salesChannel: 'online',
    metricsType: 'hourly',
    totalTicketsSold: 100,
    totalRevenue: 5000,
    averageTicketPrice: 50,
    salesVelocity: 10,
    conversionRate: 0.12,
    capacityUtilization: 0.5,
    geographicBreakdown: { US: 80, CA: 20 },
    deviceBreakdown: { desktop: 60, mobile: 40 },
    paymentMethodBreakdown: { credit_card: 70, paypal: 30 },
    promotionalCodeUsage: { totalDiscount: 500, codesUsed: 10 },
    salesFunnelMetrics: { views: 1000, clicks: 120, conversions: 100 },
    velocityMetrics: { hourlyRate: 10, dailyRate: 240 },
    customerBehavior: { newCustomers: 60, returningCustomers: 40 },
    marketingAttribution: { organic: 40, paid: 60 },
  };

  beforeEach(async () => {
    const mockTicketSalesRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
      })),
    };

    const mockEventAnalyticsRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketSalesTrackingService,
        {
          provide: getRepositoryToken(TicketSalesMetrics),
          useValue: mockTicketSalesRepo,
        },
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

    service = module.get<TicketSalesTrackingService>(TicketSalesTrackingService);
    ticketSalesRepository = module.get(getRepositoryToken(TicketSalesMetrics));
    eventAnalyticsRepository = module.get(getRepositoryToken(EventAnalytics));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackTicketSale', () => {
    it('should track a new ticket sale successfully', async () => {
      ticketSalesRepository.findOne.mockResolvedValue(null);
      ticketSalesRepository.create.mockReturnValue(mockTicketSalesMetrics as any);
      ticketSalesRepository.save.mockResolvedValue(mockTicketSalesMetrics as any);

      const result = await service.trackTicketSale(mockTicketSale.eventId, mockTicketSale);

      expect(ticketSalesRepository.findOne).toHaveBeenCalled();
      expect(ticketSalesRepository.create).toHaveBeenCalled();
      expect(ticketSalesRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('ticket.sale.tracked', expect.any(Object));
      expect(result).toBeDefined();
    });

    it('should update existing metrics when tracking sale', async () => {
      ticketSalesRepository.findOne.mockResolvedValue(mockTicketSalesMetrics as any);
      ticketSalesRepository.save.mockResolvedValue(mockTicketSalesMetrics as any);

      await service.trackTicketSale(mockTicketSale.eventId, mockTicketSale);

      expect(ticketSalesRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('ticket.sale.tracked', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      ticketSalesRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.trackTicketSale(mockTicketSale.eventId, mockTicketSale))
        .rejects.toThrow('Database error');
    });
  });

  describe('getTicketSalesMetrics', () => {
    it('should retrieve ticket sales metrics', async () => {
      ticketSalesRepository.find.mockResolvedValue([mockTicketSalesMetrics as any]);

      const result = await service.getTicketSalesMetrics(mockTicketSale.eventId);

      expect(ticketSalesRepository.find).toHaveBeenCalledWith({
        where: { eventId: mockTicketSale.eventId },
        order: { timestamp: 'DESC' },
      });
      expect(result).toEqual([mockTicketSalesMetrics]);
    });

    it('should return empty array when no metrics found', async () => {
      ticketSalesRepository.find.mockResolvedValue([]);

      const result = await service.getTicketSalesMetrics('nonexistent-event');

      expect(result).toEqual([]);
    });
  });

  describe('generateSalesProjections', () => {
    it('should generate sales projections with different models', async () => {
      const mockHistoricalData = [
        { ...mockTicketSalesMetrics, timestamp: new Date('2023-01-01') },
        { ...mockTicketSalesMetrics, timestamp: new Date('2023-01-02') },
      ];

      ticketSalesRepository.find.mockResolvedValue(mockHistoricalData as any);

      const result = await service.generateSalesProjections(mockTicketSale.eventId, '7d');

      expect(result).toBeDefined();
      expect(result.projections).toBeDefined();
      expect(result.models).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle insufficient data for projections', async () => {
      ticketSalesRepository.find.mockResolvedValue([]);

      const result = await service.generateSalesProjections(mockTicketSale.eventId, '7d');

      expect(result.projections.linear).toBe(0);
      expect(result.projections.exponential).toBe(0);
    });
  });

  describe('calculateSalesVelocity', () => {
    it('should calculate sales velocity correctly', async () => {
      const recentSales = [
        { timestamp: new Date(Date.now() - 60 * 60 * 1000), totalTicketsSold: 10 },
        { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), totalTicketsSold: 8 },
      ];

      const velocity = service['calculateSalesVelocity'](recentSales as any);

      expect(velocity).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      const velocity = service['calculateSalesVelocity']([]);
      expect(velocity).toBe(0);
    });
  });

  describe('updateHourlyMetrics', () => {
    it('should update hourly metrics correctly', async () => {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      ticketSalesRepository.findOne.mockResolvedValue(null);
      ticketSalesRepository.create.mockReturnValue(mockTicketSalesMetrics as any);
      ticketSalesRepository.save.mockResolvedValue(mockTicketSalesMetrics as any);

      await service['updateHourlyMetrics'](mockTicketSale.eventId, mockTicketSale);

      expect(ticketSalesRepository.findOne).toHaveBeenCalled();
      expect(ticketSalesRepository.save).toHaveBeenCalled();
    });
  });

  describe('generateAlerts', () => {
    it('should generate velocity drop alert', () => {
      const metrics = { ...mockTicketSalesMetrics, salesVelocity: 2 };
      const alerts = service['generateAlerts'](metrics as any);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'sales_velocity_drop',
          severity: 'high',
        })
      );
    });

    it('should generate capacity warning alert', () => {
      const metrics = { ...mockTicketSalesMetrics, capacityUtilization: 0.96 };
      const alerts = service['generateAlerts'](metrics as any);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'capacity_warning',
          severity: 'medium',
        })
      );
    });

    it('should not generate alerts for normal metrics', () => {
      const alerts = service['generateAlerts'](mockTicketSalesMetrics as any);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined ticket sale data', async () => {
      await expect(service.trackTicketSale('event-123', null as any))
        .rejects.toThrow();
    });

    it('should handle invalid event ID', async () => {
      await expect(service.trackTicketSale('', mockTicketSale))
        .rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      ticketSalesRepository.find.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getTicketSalesMetrics('event-123'))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('performance and optimization', () => {
    it('should batch multiple sales efficiently', async () => {
      const multipleSales = Array(10).fill(mockTicketSale);
      
      ticketSalesRepository.findOne.mockResolvedValue(mockTicketSalesMetrics as any);
      ticketSalesRepository.save.mockResolvedValue(mockTicketSalesMetrics as any);

      for (const sale of multipleSales) {
        await service.trackTicketSale(sale.eventId, sale);
      }

      expect(ticketSalesRepository.save).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent sales tracking', async () => {
      const concurrentSales = Array(5).fill(mockTicketSale).map((sale, index) => ({
        ...sale,
        ticketId: `ticket-${index}`,
      }));

      ticketSalesRepository.findOne.mockResolvedValue(null);
      ticketSalesRepository.create.mockReturnValue(mockTicketSalesMetrics as any);
      ticketSalesRepository.save.mockResolvedValue(mockTicketSalesMetrics as any);

      const promises = concurrentSales.map(sale => 
        service.trackTicketSale(sale.eventId, sale)
      );

      await Promise.all(promises);

      expect(ticketSalesRepository.save).toHaveBeenCalledTimes(5);
    });
  });
});
