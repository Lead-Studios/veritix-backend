import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingStrategyService } from '../services/pricing-strategy.service';
import { TicketHistory } from '../../ticket/entities/ticket-history.entity';
import { TicketTier } from '../entities/ticket-tier.entity';
import { PricingStrategy } from '../enums/pricing-strategy.enum';

describe('PricingStrategyService', () => {
  let service: PricingStrategyService;
  let ticketHistoryRepo: Repository<TicketHistory>;

  const mockTicketHistoryRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
  };

  const mockTicketTier: TicketTier = {
    id: 'tier-1',
    name: 'VIP Ticket',
    price: 100,
    quantity: 100,
    benefits: 'Premium seating',
    pricingStrategy: PricingStrategy.FIXED,
    pricingConfig: {},
    eventId: 'event-1',
    event: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingStrategyService,
        {
          provide: getRepositoryToken(TicketHistory),
          useValue: mockTicketHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<PricingStrategyService>(PricingStrategyService);
    ticketHistoryRepo = module.get<Repository<TicketHistory>>(getRepositoryToken(TicketHistory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDynamicPrice', () => {
    beforeEach(() => {
      mockTicketHistoryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    describe('FIXED strategy', () => {
      it('should return original price for fixed strategy', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(0);

        const config = {
          strategy: PricingStrategy.FIXED,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        expect(result.currentPrice).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.strategy).toBe(PricingStrategy.FIXED);
        expect(result.soldCount).toBe(0);
        expect(result.soldPercentage).toBe(0);
      });

      it('should return original price regardless of sold count', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(50);

        const config = {
          strategy: PricingStrategy.FIXED,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        expect(result.currentPrice).toBe(100);
        expect(result.soldCount).toBe(50);
        expect(result.soldPercentage).toBe(50);
      });
    });

    describe('LINEAR strategy', () => {
      it('should calculate linear price increase based on demand', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(25); // 25% sold

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
          demandMultiplier: 1.5,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Expected: 100 * (1 + (25/100) * (1.5 - 1)) = 100 * 1.125 = 112.5
        expect(result.currentPrice).toBe(112.5);
        expect(result.soldPercentage).toBe(25);
      });

      it('should use default demand multiplier when not provided', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(50); // 50% sold

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Expected: 100 * (1 + (50/100) * (1.5 - 1)) = 100 * 1.25 = 125
        expect(result.currentPrice).toBe(125);
      });

      it('should respect max price constraint', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(80); // 80% sold

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
          demandMultiplier: 2,
          maxPrice: 150,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Without max constraint: 100 * (1 + (80/100) * (2 - 1)) = 180
        // With max constraint: 150
        expect(result.currentPrice).toBe(150);
      });

      it('should respect min price constraint', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(0); // 0% sold

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
          demandMultiplier: 0.5, // This would decrease price
          minPrice: 90,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Without min constraint: 100 * (1 + (0/100) * (0.5 - 1)) = 100
        // With min constraint: 90 (but only if calculated price < 90)
        expect(result.currentPrice).toBe(100);
      });
    });

    describe('THRESHOLD strategy', () => {
      it('should apply threshold-based pricing correctly', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(60); // 60% sold

        const config = {
          strategy: PricingStrategy.THRESHOLD,
          basePrice: 100,
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
            { soldPercentage: 75, priceMultiplier: 1.5 },
          ],
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // 60% sold should trigger the 50% threshold: 100 * 1.25 = 125
        expect(result.currentPrice).toBe(125);
      });

      it('should return base price when no thresholds are met', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(20); // 20% sold

        const config = {
          strategy: PricingStrategy.THRESHOLD,
          basePrice: 100,
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
          ],
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        expect(result.currentPrice).toBe(100);
      });

      it('should handle empty thresholds array', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(50);

        const config = {
          strategy: PricingStrategy.THRESHOLD,
          basePrice: 100,
          thresholds: [],
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        expect(result.currentPrice).toBe(100);
      });

      it('should apply highest applicable threshold', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(80); // 80% sold

        const config = {
          strategy: PricingStrategy.THRESHOLD,
          basePrice: 100,
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
            { soldPercentage: 75, priceMultiplier: 1.5 },
            { soldPercentage: 90, priceMultiplier: 2.0 },
          ],
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // 80% sold should trigger the 75% threshold: 100 * 1.5 = 150
        expect(result.currentPrice).toBe(150);
      });
    });

    describe('EXPONENTIAL strategy', () => {
      it('should calculate exponential price increase', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(50); // 50% sold

        const config = {
          strategy: PricingStrategy.EXPONENTIAL,
          basePrice: 100,
          demandMultiplier: 2,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Expected: 100 * 2^(50/100) = 100 * 2^0.5 = 100 * 1.414 = 141.42
        expect(result.currentPrice).toBe(141.42);
      });

      it('should use default demand multiplier when not provided', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(25); // 25% sold

        const config = {
          strategy: PricingStrategy.EXPONENTIAL,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Expected: 100 * 2^(25/100) = 100 * 2^0.25 = 100 * 1.189 = 118.92
        expect(result.currentPrice).toBe(118.92);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero quantity', async () => {
        const zeroQuantityTier = { ...mockTicketTier, quantity: 0 };
        mockQueryBuilder.getCount.mockResolvedValue(0);

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(zeroQuantityTier, config);

        expect(result.soldPercentage).toBe(0);
        expect(result.currentPrice).toBe(100);
      });

      it('should round prices to 2 decimal places', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(33); // 33% sold

        const config = {
          strategy: PricingStrategy.LINEAR,
          basePrice: 100,
          demandMultiplier: 1.333333,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        // Should be rounded to 2 decimal places
        expect(result.currentPrice).toBe(111);
      });

      it('should handle unknown strategy gracefully', async () => {
        mockQueryBuilder.getCount.mockResolvedValue(50);

        const config = {
          strategy: 'UNKNOWN' as PricingStrategy,
          basePrice: 100,
        };

        const result = await service.calculateDynamicPrice(mockTicketTier, config);

        expect(result.currentPrice).toBe(100);
      });
    });
  });

  describe('getDefaultConfig', () => {
    it('should return correct config for LINEAR strategy', () => {
      const config = service.getDefaultConfig(PricingStrategy.LINEAR);

      expect(config.strategy).toBe(PricingStrategy.LINEAR);
      expect(config.demandMultiplier).toBe(1.5);
      expect(config.maxPrice).toBeUndefined();
      expect(config.minPrice).toBeUndefined();
    });

    it('should return correct config for THRESHOLD strategy', () => {
      const config = service.getDefaultConfig(PricingStrategy.THRESHOLD);

      expect(config.strategy).toBe(PricingStrategy.THRESHOLD);
      expect(config.thresholds).toHaveLength(4);
      expect(config.thresholds![0]).toEqual({ soldPercentage: 25, priceMultiplier: 1.1 });
      expect(config.thresholds![3]).toEqual({ soldPercentage: 90, priceMultiplier: 2.0 });
    });

    it('should return correct config for EXPONENTIAL strategy', () => {
      const config = service.getDefaultConfig(PricingStrategy.EXPONENTIAL);

      expect(config.strategy).toBe(PricingStrategy.EXPONENTIAL);
      expect(config.demandMultiplier).toBe(2);
    });

    it('should return correct config for FIXED strategy', () => {
      const config = service.getDefaultConfig(PricingStrategy.FIXED);

      expect(config.strategy).toBe(PricingStrategy.FIXED);
      expect(config.basePrice).toBe(0);
    });
  });

  describe('getSoldCount', () => {
    it('should query ticket history with correct parameters', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(25);

      const result = await service['getSoldCount'](mockTicketTier);

      expect(mockTicketHistoryRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('th.ticket', 'ticket');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ticket.eventId = :eventId', { eventId: 'event-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('th.amount >= :minPrice', { minPrice: 95 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('th.amount <= :maxPrice', { maxPrice: 105 });
      expect(result).toBe(25);
    });

    it('should calculate price tolerance correctly', async () => {
      const tierWithDifferentPrice = { ...mockTicketTier, price: 200 };
      mockQueryBuilder.getCount.mockResolvedValue(10);

      await service['getSoldCount'](tierWithDifferentPrice);

      // 5% tolerance: 200 * 0.95 = 190, 200 * 1.05 = 210
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('th.amount >= :minPrice', { minPrice: 190 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('th.amount <= :maxPrice', { maxPrice: 210 });
    });
  });
}); 