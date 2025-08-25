import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TicketIntegrationService } from '../ticket-integration.service';
import { SeatSelectionService } from '../seat-selection.service';
import { SeatReservationService } from '../seat-reservation.service';
import { EnhancedSeat } from '../../entities/enhanced-seat.entity';
import { SeatReservation } from '../../entities/seat-reservation.entity';
import { VenueMap } from '../../entities/venue-map.entity';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('TicketIntegrationService', () => {
  let service: TicketIntegrationService;
  let seatRepository: Repository<EnhancedSeat>;
  let reservationRepository: Repository<SeatReservation>;
  let venueMapRepository: Repository<VenueMap>;
  let entityManager: EntityManager;
  let seatSelectionService: SeatSelectionService;
  let seatReservationService: SeatReservationService;

  const mockSeat = {
    id: 'seat-1',
    row: 'A',
    number: '1',
    status: 'available',
    basePrice: 50.00,
    sectionId: 'section-1',
    venueMapId: 'venue-1',
    pricingTier: {
      id: 'tier-1',
      pricingMultiplier: 1.2
    }
  };

  const mockReservation = {
    id: 'reservation-1',
    seatId: 'seat-1',
    sessionId: 'session-1',
    status: 'active',
    type: 'temporary',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    seat: mockSeat
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketIntegrationService,
        {
          provide: getRepositoryToken(EnhancedSeat),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SeatReservation),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VenueMap),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: SeatSelectionService,
          useValue: {
            selectSeat: jest.fn(),
            deselectSeat: jest.fn(),
          },
        },
        {
          provide: SeatReservationService,
          useValue: {
            createReservation: jest.fn(),
            extendReservation: jest.fn(),
            releaseReservation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketIntegrationService>(TicketIntegrationService);
    seatRepository = module.get<Repository<EnhancedSeat>>(getRepositoryToken(EnhancedSeat));
    reservationRepository = module.get<Repository<SeatReservation>>(getRepositoryToken(SeatReservation));
    venueMapRepository = module.get<Repository<VenueMap>>(getRepositoryToken(VenueMap));
    entityManager = module.get<EntityManager>(EntityManager);
    seatSelectionService = module.get<SeatSelectionService>(SeatSelectionService);
    seatReservationService = module.get<SeatReservationService>(SeatReservationService);
  });

  describe('initializeCart', () => {
    it('should successfully initialize cart with seat holds', async () => {
      const cartDto = {
        cartId: 'cart-123',
        sessionId: 'session-1',
        seatIds: ['seat-1', 'seat-2'],
        expiryMinutes: 15
      };

      const mockReservation = { id: 'reservation-1' };
      jest.spyOn(seatReservationService, 'createReservation')
        .mockResolvedValue(mockReservation as any);

      const result = await service.initializeCart(cartDto);

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(2);
      expect(result.expiresAt).toBeDefined();
      expect(seatReservationService.createReservation).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during cart initialization', async () => {
      const cartDto = {
        cartId: 'cart-123',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
        expiryMinutes: 15
      };

      jest.spyOn(seatReservationService, 'createReservation')
        .mockRejectedValue(new Error('Seat not available'));

      await expect(service.initializeCart(cartDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateCheckout', () => {
    it('should upgrade cart reservations to checkout', async () => {
      const checkoutDto = {
        cartId: 'cart-123',
        sessionId: 'session-1',
        checkoutDurationMinutes: 10,
        paymentIntentId: 'pi_123'
      };

      const mockReservations = [mockReservation];
      jest.spyOn(reservationRepository, 'find').mockResolvedValue(mockReservations as any);
      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          update: jest.fn().mockResolvedValue({ affected: 1 })
        };
        return callback(mockManager);
      });

      const result = await service.initiateCheckout(checkoutDto);

      expect(result.success).toBe(true);
      expect(result.checkoutExpiresAt).toBeDefined();
    });

    it('should throw error when no active reservations found', async () => {
      const checkoutDto = {
        cartId: 'cart-123',
        sessionId: 'session-1',
        checkoutDurationMinutes: 10,
        paymentIntentId: 'pi_123'
      };

      jest.spyOn(reservationRepository, 'find').mockResolvedValue([]);

      await expect(service.initiateCheckout(checkoutDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('calculatePricing', () => {
    it('should calculate pricing for selected seats', async () => {
      const pricingDto = {
        seatIds: ['seat-1'],
        applyDynamicPricing: true,
        groupDiscount: 10
      };

      const mockSeats = [mockSeat];
      jest.spyOn(seatRepository, 'find').mockResolvedValue(mockSeats as any);

      const result = await service.calculatePricing(pricingDto);

      expect(result.seatPricing).toHaveLength(1);
      expect(result.totalBaseAmount).toBe(50);
      expect(result.totalDiscountAmount).toBeGreaterThan(0);
      expect(result.finalTotalAmount).toBeDefined();
    });

    it('should throw error when some seats not found', async () => {
      const pricingDto = {
        seatIds: ['seat-1', 'seat-2'],
        applyDynamicPricing: false
      };

      jest.spyOn(seatRepository, 'find').mockResolvedValue([mockSeat] as any);

      await expect(service.calculatePricing(pricingDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('holdSeats', () => {
    it('should hold seats for specified duration', async () => {
      const holdDto = {
        seatIds: ['seat-1'],
        holdDurationMinutes: 30,
        holdReference: 'hold-123',
        holdType: 'cart' as const
      };

      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(mockSeat),
          save: jest.fn().mockResolvedValue({ id: 'reservation-1' }),
          update: jest.fn().mockResolvedValue({ affected: 1 })
        };
        return callback(mockManager);
      });

      const result = await service.holdSeats(holdDto);

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(1);
      expect(result.holdExpiresAt).toBeDefined();
    });

    it('should throw ConflictException when seat not available', async () => {
      const holdDto = {
        seatIds: ['seat-1'],
        holdDurationMinutes: 30,
        holdReference: 'hold-123',
        holdType: 'cart' as const
      };

      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({ ...mockSeat, status: 'sold' }),
        };
        return callback(mockManager);
      });

      await expect(service.holdSeats(holdDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseSeats', () => {
    it('should release held seats', async () => {
      const releaseDto = {
        seatIds: ['seat-1'],
        reason: 'User cancelled',
        referenceId: 'session-1'
      };

      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          find: jest.fn().mockResolvedValue([mockReservation]),
          update: jest.fn().mockResolvedValue({ affected: 1 })
        };
        return callback(mockManager);
      });

      const result = await service.releaseSeats(releaseDto);

      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(1);
    });
  });

  describe('completePurchase', () => {
    it('should complete purchase and generate tickets', async () => {
      const purchaseDto = {
        eventId: 'event-1',
        venueMapId: 'venue-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
        totalAmount: 60,
        paymentMethodId: 'pm_123',
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };

      const mockReservations = [mockReservation];
      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          find: jest.fn().mockResolvedValue(mockReservations),
          update: jest.fn().mockResolvedValue({ affected: 1 })
        };
        return callback(mockManager);
      });

      const result = await service.completePurchase(purchaseDto);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.ticketIds).toHaveLength(1);
      expect(result.totalAmount).toBe(60);
      expect(result.seats).toHaveLength(1);
    });

    it('should return error response when no reservations found', async () => {
      const purchaseDto = {
        eventId: 'event-1',
        venueMapId: 'venue-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
        totalAmount: 60,
        paymentMethodId: 'pm_123',
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };

      jest.spyOn(entityManager, 'transaction').mockImplementation(async (callback) => {
        const mockManager = {
          find: jest.fn().mockResolvedValue([])
        };
        return callback(mockManager);
      });

      const result = await service.completePurchase(purchaseDto);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('generateTickets', () => {
    it('should generate tickets from completed reservations', async () => {
      const ticketDto = {
        orderId: 'order-123',
        reservationIds: ['reservation-1'],
        ticketType: 'standard'
      };

      const completedReservations = [{ ...mockReservation, status: 'completed' }];
      jest.spyOn(reservationRepository, 'find').mockResolvedValue(completedReservations as any);

      const result = await service.generateTickets(ticketDto);

      expect(result.success).toBe(true);
      expect(result.ticketIds).toHaveLength(1);
    });

    it('should return error when reservations not found or not completed', async () => {
      const ticketDto = {
        orderId: 'order-123',
        reservationIds: ['reservation-1', 'reservation-2']
      };

      jest.spyOn(reservationRepository, 'find').mockResolvedValue([mockReservation] as any);

      const result = await service.generateTickets(ticketDto);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('getReservationStatus', () => {
    it('should return reservation status for session', async () => {
      const mockReservations = [mockReservation];
      jest.spyOn(reservationRepository, 'find').mockResolvedValue(mockReservations as any);

      const result = await service.getReservationStatus('session-1');

      expect(result.reservations).toHaveLength(1);
      expect(result.totalReserved).toBe(1);
      expect(result.expiresAt).toBeDefined();
      expect(result.reservations[0].seatDetails).toBeDefined();
    });

    it('should return empty result when no reservations found', async () => {
      jest.spyOn(reservationRepository, 'find').mockResolvedValue([]);

      const result = await service.getReservationStatus('session-1');

      expect(result.reservations).toHaveLength(0);
      expect(result.totalReserved).toBe(0);
      expect(result.expiresAt).toBeNull();
    });
  });
});
