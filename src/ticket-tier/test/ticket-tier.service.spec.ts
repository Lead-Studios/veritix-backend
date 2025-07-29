import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTierService } from '../ticket-tier.service';
import { PricingStrategyService } from '../services/pricing-strategy.service';
import { EventsService } from '../../events/events.service';
import { TicketTier } from '../entities/ticket-tier.entity';
import { CreateTicketTierDto } from '../dto/create-ticket-tier.dto';
import { PricingStrategy } from '../enums/pricing-strategy.enum';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TicketTierService', () => {
  let service: TicketTierService;
  let ticketTierRepo: Repository<TicketTier>;
  let pricingStrategyService: PricingStrategyService;
  let eventsService: EventsService;

  const mockTicketTierRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPricingStrategyService = {
    getDefaultConfig: jest.fn(),
    calculateDynamicPrice: jest.fn(),
  };

  const mockEventsService = {
    findOne: jest.fn(),
  };

  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    ownerId: 'user-1',
  };

  const mockTicketTier: TicketTier = {
    id: 'tier-1',
    name: 'VIP Ticket',
    price: 100,
    quantity: 100,
    benefits: 'Premium seating',
    pricingStrategy: PricingStrategy.FIXED,
    pricingConfig: null,
    eventId: 'event-1',
    event: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketTierService,
        {
          provide: getRepositoryToken(TicketTier),
          useValue: mockTicketTierRepo,
        },
        {
          provide: PricingStrategyService,
          useValue: mockPricingStrategyService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<TicketTierService>(TicketTierService);
    ticketTierRepo = module.get<Repository<TicketTier>>(getRepositoryToken(TicketTier));
    pricingStrategyService = module.get<PricingStrategyService>(PricingStrategyService);
    eventsService = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateTicketTierDto = {
      name: 'VIP Ticket',
      price: 100,
      quantity: 100,
      benefits: 'Premium seating',
    };

    it('should create a ticket tier with default pricing strategy', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockTicketTierRepo.create.mockReturnValue(mockTicketTier);
      mockTicketTierRepo.save.mockResolvedValue(mockTicketTier);

      const result = await service.create('event-1', createDto, 'user-1');

      expect(mockEventsService.findOne).toHaveBeenCalledWith('event-1');
      expect(mockTicketTierRepo.create).toHaveBeenCalledWith({
        ...createDto,
        eventId: 'event-1',
        pricingStrategy: PricingStrategy.FIXED,
        pricingConfig: undefined,
      });
      expect(mockTicketTierRepo.save).toHaveBeenCalledWith(mockTicketTier);
      expect(result).toEqual(mockTicketTier);
    });

    it('should create a ticket tier with custom pricing strategy', async () => {
      const customDto = {
        ...createDto,
        pricingStrategy: PricingStrategy.LINEAR,
        pricingConfig: {
          demandMultiplier: 1.8,
          maxPrice: 150,
        },
      };

      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockTicketTierRepo.create.mockReturnValue(mockTicketTier);
      mockTicketTierRepo.save.mockResolvedValue(mockTicketTier);

      const result = await service.create('event-1', customDto, 'user-1');

      expect(mockTicketTierRepo.create).toHaveBeenCalledWith({
        ...customDto,
        eventId: 'event-1',
        pricingStrategy: PricingStrategy.LINEAR,
        pricingConfig: {
          demandMultiplier: 1.8,
          maxPrice: 150,
        },
      });
      expect(result).toEqual(mockTicketTier);
    });

    it('should apply default config for non-fixed strategies', async () => {
      const linearDto = {
        ...createDto,
        pricingStrategy: PricingStrategy.LINEAR,
      };

      const defaultConfig = {
        strategy: PricingStrategy.LINEAR,
        basePrice: 0,
        demandMultiplier: 1.5,
        maxPrice: undefined,
        minPrice: undefined,
      };

      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockPricingStrategyService.getDefaultConfig.mockReturnValue(defaultConfig);
      mockTicketTierRepo.create.mockReturnValue(mockTicketTier);
      mockTicketTierRepo.save.mockResolvedValue(mockTicketTier);

      const result = await service.create('event-1', linearDto, 'user-1');

      expect(mockPricingStrategyService.getDefaultConfig).toHaveBeenCalledWith(PricingStrategy.LINEAR);
      expect(mockTicketTierRepo.create).toHaveBeenCalledWith({
        ...linearDto,
        eventId: 'event-1',
        pricingStrategy: PricingStrategy.LINEAR,
        pricingConfig: {
          maxPrice: undefined,
          minPrice: undefined,
          demandMultiplier: 1.5,
          thresholds: undefined,
        },
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      mockEventsService.findOne.mockResolvedValue(null);

      await expect(service.create('event-1', createDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the event', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      await expect(service.create('event-1', createDto, 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByEvent', () => {
    it('should return ticket tiers with dynamic pricing information', async () => {
      const tiers = [mockTicketTier];
      const enrichedTier = {
        id: 'tier-1',
        name: 'VIP Ticket',
        originalPrice: 100,
        currentPrice: 125,
        quantity: 100,
        benefits: 'Premium seating',
        pricingStrategy: PricingStrategy.LINEAR,
        soldCount: 25,
        availableQuantity: 75,
        soldPercentage: 25,
        pricingConfig: null,
        eventId: 'event-1',
      };

      mockTicketTierRepo.find.mockResolvedValue(tiers);
      mockPricingStrategyService.calculateDynamicPrice.mockResolvedValue({
        currentPrice: 125,
        originalPrice: 100,
        strategy: PricingStrategy.LINEAR,
        soldCount: 25,
        totalQuantity: 100,
        soldPercentage: 25,
      });

      const result = await service.findByEvent('event-1');

      expect(mockTicketTierRepo.find).toHaveBeenCalledWith({ where: { eventId: 'event-1' } });
      expect(mockPricingStrategyService.calculateDynamicPrice).toHaveBeenCalledWith(mockTicketTier, {
        strategy: PricingStrategy.FIXED,
        basePrice: 100,
        maxPrice: undefined,
        minPrice: undefined,
        demandMultiplier: undefined,
        thresholds: undefined,
      });
      expect(result).toEqual([enrichedTier]);
    });

    it('should handle multiple tiers', async () => {
      const tiers = [
        { ...mockTicketTier, id: 'tier-1', name: 'VIP' },
        { ...mockTicketTier, id: 'tier-2', name: 'Regular' },
      ];

      mockTicketTierRepo.find.mockResolvedValue(tiers);
      mockPricingStrategyService.calculateDynamicPrice
        .mockResolvedValueOnce({
          currentPrice: 125,
          originalPrice: 100,
          strategy: PricingStrategy.LINEAR,
          soldCount: 25,
          totalQuantity: 100,
          soldPercentage: 25,
        })
        .mockResolvedValueOnce({
          currentPrice: 80,
          originalPrice: 80,
          strategy: PricingStrategy.FIXED,
          soldCount: 10,
          totalQuantity: 100,
          soldPercentage: 10,
        });

      const result = await service.findByEvent('event-1');

      expect(result).toHaveLength(2);
      expect(mockPricingStrategyService.calculateDynamicPrice).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should return a single ticket tier with dynamic pricing', async () => {
      const enrichedTier = {
        id: 'tier-1',
        name: 'VIP Ticket',
        originalPrice: 100,
        currentPrice: 125,
        quantity: 100,
        benefits: 'Premium seating',
        pricingStrategy: PricingStrategy.LINEAR,
        soldCount: 25,
        availableQuantity: 75,
        soldPercentage: 25,
        pricingConfig: null,
        eventId: 'event-1',
      };

      mockTicketTierRepo.findOne.mockResolvedValue(mockTicketTier);
      mockPricingStrategyService.calculateDynamicPrice.mockResolvedValue({
        currentPrice: 125,
        originalPrice: 100,
        strategy: PricingStrategy.LINEAR,
        soldCount: 25,
        totalQuantity: 100,
        soldPercentage: 25,
      });

      const result = await service.findOne('tier-1');

      expect(mockTicketTierRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tier-1' } });
      expect(result).toEqual(enrichedTier);
    });

    it('should throw NotFoundException when tier not found', async () => {
      mockTicketTierRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('tier-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price for a ticket tier', async () => {
      mockTicketTierRepo.findOne.mockResolvedValue(mockTicketTier);
      mockPricingStrategyService.calculateDynamicPrice.mockResolvedValue({
        currentPrice: 125,
        originalPrice: 100,
        strategy: PricingStrategy.LINEAR,
        soldCount: 25,
        totalQuantity: 100,
        soldPercentage: 25,
      });

      const result = await service.getCurrentPrice('tier-1');

      expect(mockTicketTierRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tier-1' } });
      expect(mockPricingStrategyService.calculateDynamicPrice).toHaveBeenCalledWith(mockTicketTier, {
        strategy: PricingStrategy.FIXED,
        basePrice: 100,
        maxPrice: undefined,
        minPrice: undefined,
        demandMultiplier: undefined,
        thresholds: undefined,
      });
      expect(result).toBe(125);
    });

    it('should throw NotFoundException when tier not found', async () => {
      mockTicketTierRepo.findOne.mockResolvedValue(null);

      await expect(service.getCurrentPrice('tier-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('enrichWithDynamicPricing', () => {
    it('should enrich ticket tier with dynamic pricing data', async () => {
      const tierWithConfig = {
        ...mockTicketTier,
        pricingStrategy: PricingStrategy.THRESHOLD,
        pricingConfig: {
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
          ],
        },
      };

      mockPricingStrategyService.calculateDynamicPrice.mockResolvedValue({
        currentPrice: 125,
        originalPrice: 100,
        strategy: PricingStrategy.THRESHOLD,
        soldCount: 50,
        totalQuantity: 100,
        soldPercentage: 50,
      });

      const result = await service['enrichWithDynamicPricing'](tierWithConfig);

      expect(mockPricingStrategyService.calculateDynamicPrice).toHaveBeenCalledWith(tierWithConfig, {
        strategy: PricingStrategy.THRESHOLD,
        basePrice: 100,
        maxPrice: undefined,
        minPrice: undefined,
        demandMultiplier: undefined,
        thresholds: [
          { soldPercentage: 25, priceMultiplier: 1.1 },
          { soldPercentage: 50, priceMultiplier: 1.25 },
        ],
      });

      expect(result).toEqual({
        id: 'tier-1',
        name: 'VIP Ticket',
        originalPrice: 100,
        currentPrice: 125,
        quantity: 100,
        benefits: 'Premium seating',
        pricingStrategy: PricingStrategy.THRESHOLD,
        soldCount: 50,
        availableQuantity: 50,
        soldPercentage: 50,
        pricingConfig: {
          thresholds: [
            { soldPercentage: 25, priceMultiplier: 1.1 },
            { soldPercentage: 50, priceMultiplier: 1.25 },
          ],
        },
        eventId: 'event-1',
      });
    });
  });
}); 