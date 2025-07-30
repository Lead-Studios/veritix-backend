import { Test, TestingModule } from '@nestjs/testing';
import { TicketTierController } from '../ticket-tier.controller';
import { TicketTierService } from '../ticket-tier.service';
import { CreateTicketTierDto } from '../dto/create-ticket-tier.dto';
import { PricingStrategy } from '../enums/pricing-strategy.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('TicketTierController', () => {
  let controller: TicketTierController;
  let service: TicketTierService;

  const mockTicketTierService = {
    create: jest.fn(),
    findByEvent: jest.fn(),
    findOne: jest.fn(),
    getCurrentPrice: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketTierController],
      providers: [
        {
          provide: TicketTierService,
          useValue: mockTicketTierService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TicketTierController>(TicketTierController);
    service = module.get<TicketTierService>(TicketTierService);
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

    it('should create a ticket tier', async () => {
      const expectedResult = {
        id: 'tier-1',
        ...createDto,
        eventId: 'event-1',
        pricingStrategy: PricingStrategy.FIXED,
      };

      mockTicketTierService.create.mockResolvedValue(expectedResult);

      const result = await controller.create('event-1', createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(
        'event-1',
        createDto,
        'user-1',
      );
      expect(result).toEqual(expectedResult);
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

      const expectedResult = {
        id: 'tier-1',
        ...customDto,
        eventId: 'event-1',
      };

      mockTicketTierService.create.mockResolvedValue(expectedResult);

      const result = await controller.create('event-1', customDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(
        'event-1',
        customDto,
        'user-1',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByEvent', () => {
    it('should return ticket tiers for an event with dynamic pricing', async () => {
      const expectedResult = [
        {
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
        },
        {
          id: 'tier-2',
          name: 'Regular Ticket',
          originalPrice: 50,
          currentPrice: 50,
          quantity: 200,
          benefits: 'Standard seating',
          pricingStrategy: PricingStrategy.FIXED,
          soldCount: 10,
          availableQuantity: 190,
          soldPercentage: 5,
          pricingConfig: null,
          eventId: 'event-1',
        },
      ];

      mockTicketTierService.findByEvent.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent('event-1');

      expect(service.findByEvent).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(expectedResult);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('currentPrice');
      expect(result[0]).toHaveProperty('originalPrice');
      expect(result[0]).toHaveProperty('soldCount');
      expect(result[0]).toHaveProperty('availableQuantity');
      expect(result[0]).toHaveProperty('soldPercentage');
    });
  });

  describe('findOne', () => {
    it('should return a single ticket tier with dynamic pricing', async () => {
      const expectedResult = {
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

      mockTicketTierService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('tier-1');

      expect(service.findOne).toHaveBeenCalledWith('tier-1');
      expect(result).toEqual(expectedResult);
      expect(result).toHaveProperty('currentPrice', 125);
      expect(result).toHaveProperty('originalPrice', 100);
      expect(result).toHaveProperty('soldPercentage', 25);
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price for a ticket tier', async () => {
      const expectedResult = { currentPrice: 125 };

      mockTicketTierService.getCurrentPrice.mockResolvedValue(125);

      const result = await controller.getCurrentPrice('tier-1');

      expect(service.getCurrentPrice).toHaveBeenCalledWith('tier-1');
      expect(result).toEqual(expectedResult);
    });

    it('should handle decimal prices correctly', async () => {
      const expectedResult = { currentPrice: 112.5 };

      mockTicketTierService.getCurrentPrice.mockResolvedValue(112.5);

      const result = await controller.getCurrentPrice('tier-1');

      expect(result).toEqual(expectedResult);
    });
  });
});
