import { Test, TestingModule } from '@nestjs/testing';
import { SeatSelectionController } from '../seat-selection.controller';
import { SeatSelectionService } from '../../services/seat-selection.service';
import { SeatReservationService } from '../../services/seat-reservation.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('SeatSelectionController', () => {
  let controller: SeatSelectionController;
  let seatSelectionService: SeatSelectionService;
  let seatReservationService: SeatReservationService;

  const mockSeatSelectionService = {
    selectSeat: jest.fn(),
    deselectSeat: jest.fn(),
    getSeatDetails: jest.fn(),
    getSeatAvailability: jest.fn(),
    findBestSeats: jest.fn(),
    markSeatSold: jest.fn(),
    bulkUpdateSeats: jest.fn(),
  };

  const mockSeatReservationService = {
    extendReservation: jest.fn(),
    releaseReservation: jest.fn(),
    getReservationStats: jest.fn(),
    batchReleaseExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatSelectionController],
      providers: [
        {
          provide: SeatSelectionService,
          useValue: mockSeatSelectionService,
        },
        {
          provide: SeatReservationService,
          useValue: mockSeatReservationService,
        },
      ],
    }).compile();

    controller = module.get<SeatSelectionController>(SeatSelectionController);
    seatSelectionService = module.get<SeatSelectionService>(SeatSelectionService);
    seatReservationService = module.get<SeatReservationService>(SeatReservationService);
  });

  describe('selectSeat', () => {
    it('should successfully select a seat', async () => {
      const mockResponse = {
        success: true,
        reservedUntil: new Date(),
        price: 50.00
      };
      mockSeatSelectionService.selectSeat.mockResolvedValue(mockResponse);

      const result = await controller.selectSeat('seat-1', { sessionId: 'session-1' });

      expect(result).toEqual(mockResponse);
      expect(seatSelectionService.selectSeat).toHaveBeenCalledWith('seat-1', { sessionId: 'session-1' });
    });

    it('should handle seat selection conflicts', async () => {
      mockSeatSelectionService.selectSeat.mockRejectedValue(
        new ConflictException('Seat already reserved')
      );

      await expect(controller.selectSeat('seat-1', { sessionId: 'session-1' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('deselectSeat', () => {
    it('should successfully deselect a seat', async () => {
      const mockResponse = { success: true };
      mockSeatSelectionService.deselectSeat.mockResolvedValue(mockResponse);

      const result = await controller.deselectSeat('seat-1', { sessionId: 'session-1' });

      expect(result).toEqual(mockResponse);
      expect(seatSelectionService.deselectSeat).toHaveBeenCalledWith('seat-1', { sessionId: 'session-1' });
    });
  });

  describe('getSeatDetails', () => {
    it('should return seat details', async () => {
      const mockSeatDetails = {
        id: 'seat-1',
        row: 'A',
        number: '1',
        status: 'available',
        basePrice: 50.00,
        isSelectable: true
      };
      mockSeatSelectionService.getSeatDetails.mockResolvedValue(mockSeatDetails);

      const result = await controller.getSeatDetails('seat-1');

      expect(result).toEqual(mockSeatDetails);
      expect(seatSelectionService.getSeatDetails).toHaveBeenCalledWith('seat-1');
    });
  });

  describe('getSeatAvailability', () => {
    it('should return seat availability for venue map', async () => {
      const mockAvailability = {
        totalSeats: 100,
        availableSeats: 80,
        soldSeats: 15,
        heldSeats: 5,
        seatsByStatus: { available: 80, sold: 15, held: 5 },
        lastUpdated: new Date()
      };
      mockSeatSelectionService.getSeatAvailability.mockResolvedValue(mockAvailability);

      const result = await controller.getSeatAvailability('venue-1');

      expect(result).toEqual(mockAvailability);
      expect(seatSelectionService.getSeatAvailability).toHaveBeenCalledWith('venue-1');
    });
  });

  describe('findBestSeats', () => {
    it('should find best available seats', async () => {
      const findDto = {
        quantity: 2,
        adjacentRequired: true,
        priceRange: { min: 30, max: 70 }
      };
      const mockSeats = [
        { id: 'seat-1', row: 'A', number: '1' },
        { id: 'seat-2', row: 'A', number: '2' }
      ];
      mockSeatSelectionService.findBestSeats.mockResolvedValue(mockSeats);

      const result = await controller.findBestSeats('venue-1', findDto);

      expect(result).toEqual(mockSeats);
      expect(seatSelectionService.findBestSeats).toHaveBeenCalledWith('venue-1', findDto);
    });
  });

  describe('extendReservation', () => {
    it('should extend seat reservation', async () => {
      const extendDto = { sessionId: 'session-1', extensionMinutes: 15 };
      const mockResponse = {
        success: true,
        newExpiryTime: new Date()
      };
      mockSeatReservationService.extendReservation.mockResolvedValue(mockResponse);

      const result = await controller.extendReservation('seat-1', extendDto);

      expect(result).toEqual(mockResponse);
      expect(seatReservationService.extendReservation).toHaveBeenCalledWith('seat-1', extendDto);
    });
  });

  describe('releaseReservation', () => {
    it('should release seat reservation', async () => {
      const releaseDto = { reason: 'User cancelled' };
      const mockResponse = { success: true };
      mockSeatReservationService.releaseReservation.mockResolvedValue(mockResponse);

      const result = await controller.releaseReservation('seat-1', releaseDto);

      expect(result).toEqual(mockResponse);
      expect(seatReservationService.releaseReservation).toHaveBeenCalledWith('seat-1', releaseDto);
    });
  });

  describe('bulkUpdateSeats', () => {
    it('should update multiple seats', async () => {
      const bulkDto = {
        seatIds: ['seat-1', 'seat-2'],
        status: 'blocked' as const,
        metadata: { reason: 'Maintenance' }
      };
      const mockResponse = {
        success: true,
        updatedCount: 2
      };
      mockSeatSelectionService.bulkUpdateSeats.mockResolvedValue(mockResponse);

      const result = await controller.bulkUpdateSeats(bulkDto);

      expect(result).toEqual(mockResponse);
      expect(seatSelectionService.bulkUpdateSeats).toHaveBeenCalledWith(
        bulkDto.seatIds,
        bulkDto.status,
        bulkDto.metadata
      );
    });
  });

  describe('getReservationStats', () => {
    it('should return reservation statistics', async () => {
      const mockStats = {
        totalReservations: 50,
        activeReservations: 30,
        expiredReservations: 15,
        completedReservations: 5
      };
      mockSeatReservationService.getReservationStats.mockResolvedValue(mockStats);

      const result = await controller.getReservationStats('venue-1');

      expect(result).toEqual(mockStats);
      expect(seatReservationService.getReservationStats).toHaveBeenCalledWith('venue-1');
    });
  });

  describe('batchReleaseExpired', () => {
    it('should release expired reservations', async () => {
      const mockResponse = {
        success: true,
        releasedCount: 10
      };
      mockSeatReservationService.batchReleaseExpired.mockResolvedValue(mockResponse);

      const result = await controller.batchReleaseExpired('venue-1');

      expect(result).toEqual(mockResponse);
      expect(seatReservationService.batchReleaseExpired).toHaveBeenCalledWith('venue-1');
    });
  });
});
