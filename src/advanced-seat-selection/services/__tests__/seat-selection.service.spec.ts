import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatSelectionService } from '../seat-selection.service';
import { EnhancedSeat } from '../../entities/enhanced-seat.entity';
import { SeatReservation } from '../../entities/seat-reservation.entity';
import { VenueMap } from '../../entities/venue-map.entity';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('SeatSelectionService', () => {
  let service: SeatSelectionService;
  let seatRepository: Repository<EnhancedSeat>;
  let reservationRepository: Repository<SeatReservation>;
  let venueMapRepository: Repository<VenueMap>;

  const mockSeat = {
    id: 'seat-1',
    row: 'A',
    number: '1',
    status: 'available',
    basePrice: 50.00,
    sectionId: 'section-1',
    venueMapId: 'venue-1',
    position: { x: 100, y: 100, width: 20, height: 20 },
    adjacentSeats: { left: null, right: 'seat-2', front: null, back: null },
    popularityScore: 0.5,
    selectionCount: 10,
    lastSelectedAt: new Date()
  };

  const mockReservation = {
    id: 'reservation-1',
    seatId: 'seat-1',
    sessionId: 'session-1',
    status: 'active',
    type: 'temporary',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatSelectionService,
        {
          provide: getRepositoryToken(EnhancedSeat),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(SeatReservation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VenueMap),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeatSelectionService>(SeatSelectionService);
    seatRepository = module.get<Repository<EnhancedSeat>>(getRepositoryToken(EnhancedSeat));
    reservationRepository = module.get<Repository<SeatReservation>>(getRepositoryToken(SeatReservation));
    venueMapRepository = module.get<Repository<VenueMap>>(getRepositoryToken(VenueMap));
  });

  describe('selectSeat', () => {
    it('should successfully select an available seat', async () => {
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(mockSeat as any);
      jest.spyOn(reservationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(reservationRepository, 'save').mockResolvedValue(mockReservation as any);
      jest.spyOn(seatRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const result = await service.selectSeat('seat-1', { sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(result.reservedUntil).toBeDefined();
      expect(seatRepository.update).toHaveBeenCalledWith('seat-1', {
        status: 'held',
        holdInfo: expect.any(Object),
        selectionCount: 11,
        lastSelectedAt: expect.any(Date),
      });
    });

    it('should throw ConflictException when seat is not available', async () => {
      const unavailableSeat = { ...mockSeat, status: 'sold' };
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(unavailableSeat as any);

      await expect(service.selectSeat('seat-1', { sessionId: 'session-1' }))
        .rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when seat not found', async () => {
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(null);

      await expect(service.selectSeat('seat-1', { sessionId: 'session-1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when seat already reserved by another session', async () => {
      const existingReservation = { ...mockReservation, sessionId: 'other-session' };
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(mockSeat as any);
      jest.spyOn(reservationRepository, 'findOne').mockResolvedValue(existingReservation as any);

      await expect(service.selectSeat('seat-1', { sessionId: 'session-1' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('deselectSeat', () => {
    it('should successfully deselect a seat', async () => {
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue({ ...mockSeat, status: 'held' } as any);
      jest.spyOn(reservationRepository, 'findOne').mockResolvedValue(mockReservation as any);
      jest.spyOn(reservationRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(seatRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const result = await service.deselectSeat('seat-1', { sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(seatRepository.update).toHaveBeenCalledWith('seat-1', {
        status: 'available',
        holdInfo: null,
      });
    });

    it('should throw BadRequestException when no active reservation found', async () => {
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(mockSeat as any);
      jest.spyOn(reservationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deselectSeat('seat-1', { sessionId: 'session-1' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getSeatAvailability', () => {
    it('should return seat availability for venue map', async () => {
      const mockSeats = [
        { ...mockSeat, status: 'available' },
        { ...mockSeat, id: 'seat-2', status: 'sold' },
        { ...mockSeat, id: 'seat-3', status: 'held' },
      ];
      jest.spyOn(seatRepository, 'find').mockResolvedValue(mockSeats as any);

      const result = await service.getSeatAvailability('venue-1');

      expect(result.totalSeats).toBe(3);
      expect(result.availableSeats).toBe(1);
      expect(result.soldSeats).toBe(1);
      expect(result.heldSeats).toBe(1);
      expect(result.seatsByStatus).toEqual({
        available: 1,
        sold: 1,
        held: 1,
      });
    });
  });

  describe('findBestSeats', () => {
    it('should find best available seats with adjacency preference', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSeat]),
      };
      jest.spyOn(seatRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findBestSeats('venue-1', {
        quantity: 2,
        adjacentRequired: true,
      });

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('seat.venueMapId = :venueMapId', { venueMapId: 'venue-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('seat.status = :status', { status: 'available' });
    });

    it('should apply price range filter when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSeat]),
      };
      jest.spyOn(seatRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.findBestSeats('venue-1', {
        quantity: 1,
        priceRange: { min: 30, max: 70 },
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'seat.basePrice BETWEEN :minPrice AND :maxPrice',
        { minPrice: 30, maxPrice: 70 }
      );
    });
  });

  describe('getSeatDetails', () => {
    it('should return detailed seat information', async () => {
      const seatWithRelations = {
        ...mockSeat,
        pricingTier: { id: 'tier-1', name: 'Standard', pricingMultiplier: 1.0 },
        reservation: mockReservation,
      };
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(seatWithRelations as any);

      const result = await service.getSeatDetails('seat-1');

      expect(result.id).toBe('seat-1');
      expect(result.row).toBe('A');
      expect(result.number).toBe('1');
      expect(result.basePrice).toBe(50.00);
      expect(result.isSelectable).toBe(false); // Because it has an active reservation
      expect(result.pricingTier).toBeDefined();
      expect(result.reservation).toBeDefined();
    });

    it('should throw BadRequestException when seat not found', async () => {
      jest.spyOn(seatRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSeatDetails('seat-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('markSeatSold', () => {
    it('should mark seat as sold and complete reservation', async () => {
      jest.spyOn(reservationRepository, 'findOne').mockResolvedValue(mockReservation as any);
      jest.spyOn(reservationRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(seatRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const result = await service.markSeatSold('seat-1', 'session-1', 'order-123');

      expect(result.success).toBe(true);
      expect(seatRepository.update).toHaveBeenCalledWith('seat-1', {
        status: 'sold',
        holdInfo: null,
      });
      expect(reservationRepository.update).toHaveBeenCalledWith(mockReservation.id, {
        status: 'completed',
        completedAt: expect.any(Date),
      });
    });
  });

  describe('bulkUpdateSeats', () => {
    it('should update multiple seats status', async () => {
      const seatIds = ['seat-1', 'seat-2', 'seat-3'];
      jest.spyOn(seatRepository, 'update').mockResolvedValue({ affected: 3 } as any);

      const result = await service.bulkUpdateSeats(seatIds, 'blocked');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(seatRepository.update).toHaveBeenCalledWith(
        { id: expect.any(Object) }, // In operator
        { status: 'blocked' }
      );
    });
  });
});
