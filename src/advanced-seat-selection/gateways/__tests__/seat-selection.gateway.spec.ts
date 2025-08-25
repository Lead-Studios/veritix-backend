import { Test, TestingModule } from '@nestjs/testing';
import { SeatSelectionGateway } from '../seat-selection.gateway';
import { SeatSelectionService } from '../../services/seat-selection.service';
import { SeatReservationService } from '../../services/seat-reservation.service';
import { Server, Socket } from 'socket.io';

describe('SeatSelectionGateway', () => {
  let gateway: SeatSelectionGateway;
  let seatSelectionService: SeatSelectionService;
  let seatReservationService: SeatReservationService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockSeatSelectionService = {
    selectSeat: jest.fn(),
    deselectSeat: jest.fn(),
    getSeatDetails: jest.fn(),
  };

  const mockSeatReservationService = {
    extendReservation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatSelectionGateway,
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

    gateway = module.get<SeatSelectionGateway>(SeatSelectionGateway);
    seatSelectionService = module.get<SeatSelectionService>(SeatSelectionService);
    seatReservationService = module.get<SeatReservationService>(SeatReservationService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'client-123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      data: {},
    };

    gateway.server = mockServer as Server;
  });

  describe('handleConnection', () => {
    it('should handle client connection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      gateway.handleConnection(mockClient as Socket);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client connected: client-123');
      consoleSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      gateway.handleDisconnect(mockClient as Socket);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected: client-123');
      consoleSpy.mockRestore();
    });
  });

  describe('handleJoinVenueMap', () => {
    it('should join client to venue map room', async () => {
      const data = { venueMapId: 'venue-1' };
      
      await gateway.handleJoinVenueMap(mockClient as Socket, data);
      
      expect(mockClient.join).toHaveBeenCalledWith('venue-1');
      expect(mockClient.emit).toHaveBeenCalledWith('joined-venue-map', {
        venueMapId: 'venue-1',
        message: 'Successfully joined venue map'
      });
    });
  });

  describe('handleLeaveVenueMap', () => {
    it('should remove client from venue map room', async () => {
      const data = { venueMapId: 'venue-1' };
      
      await gateway.handleLeaveVenueMap(mockClient as Socket, data);
      
      expect(mockClient.leave).toHaveBeenCalledWith('venue-1');
      expect(mockClient.emit).toHaveBeenCalledWith('left-venue-map', {
        venueMapId: 'venue-1',
        message: 'Successfully left venue map'
      });
    });
  });

  describe('handleSelectSeat', () => {
    it('should handle seat selection and broadcast update', async () => {
      const data = { seatId: 'seat-1', sessionId: 'session-1' };
      const mockResponse = {
        success: true,
        reservedUntil: new Date(),
        price: 50.00
      };
      
      mockSeatSelectionService.selectSeat.mockResolvedValue(mockResponse);
      
      await gateway.handleSelectSeat(mockClient as Socket, data);
      
      expect(seatSelectionService.selectSeat).toHaveBeenCalledWith('seat-1', { sessionId: 'session-1' });
      expect(mockClient.emit).toHaveBeenCalledWith('seat-selected', {
        seatId: 'seat-1',
        success: true,
        reservedUntil: mockResponse.reservedUntil,
        price: mockResponse.price
      });
    });

    it('should handle seat selection failure', async () => {
      const data = { seatId: 'seat-1', sessionId: 'session-1' };
      const error = new Error('Seat not available');
      
      mockSeatSelectionService.selectSeat.mockRejectedValue(error);
      
      await gateway.handleSelectSeat(mockClient as Socket, data);
      
      expect(mockClient.emit).toHaveBeenCalledWith('seat-selection-error', {
        seatId: 'seat-1',
        error: 'Seat not available'
      });
    });
  });

  describe('handleDeselectSeat', () => {
    it('should handle seat deselection and broadcast update', async () => {
      const data = { seatId: 'seat-1', sessionId: 'session-1' };
      const mockResponse = { success: true };
      
      mockSeatSelectionService.deselectSeat.mockResolvedValue(mockResponse);
      
      await gateway.handleDeselectSeat(mockClient as Socket, data);
      
      expect(seatSelectionService.deselectSeat).toHaveBeenCalledWith('seat-1', { sessionId: 'session-1' });
      expect(mockClient.emit).toHaveBeenCalledWith('seat-deselected', {
        seatId: 'seat-1',
        success: true
      });
    });
  });

  describe('handleExtendReservation', () => {
    it('should extend reservation and emit response', async () => {
      const data = { seatId: 'seat-1', sessionId: 'session-1', extensionMinutes: 15 };
      const mockResponse = {
        success: true,
        newExpiryTime: new Date()
      };
      
      mockSeatReservationService.extendReservation.mockResolvedValue(mockResponse);
      
      await gateway.handleExtendReservation(mockClient as Socket, data);
      
      expect(seatReservationService.extendReservation).toHaveBeenCalledWith('seat-1', {
        sessionId: 'session-1',
        extensionMinutes: 15
      });
      expect(mockClient.emit).toHaveBeenCalledWith('reservation-extended', {
        seatId: 'seat-1',
        success: true,
        newExpiryTime: mockResponse.newExpiryTime
      });
    });
  });

  describe('handleGetSeatDetails', () => {
    it('should get seat details and emit response', async () => {
      const data = { seatId: 'seat-1' };
      const mockSeatDetails = {
        id: 'seat-1',
        row: 'A',
        number: '1',
        status: 'available',
        basePrice: 50.00
      };
      
      mockSeatSelectionService.getSeatDetails.mockResolvedValue(mockSeatDetails);
      
      await gateway.handleGetSeatDetails(mockClient as Socket, data);
      
      expect(seatSelectionService.getSeatDetails).toHaveBeenCalledWith('seat-1');
      expect(mockClient.emit).toHaveBeenCalledWith('seat-details', mockSeatDetails);
    });
  });

  describe('broadcastSeatUpdate', () => {
    it('should broadcast seat availability update to venue map room', () => {
      const venueMapId = 'venue-1';
      const seatId = 'seat-1';
      const status = 'sold';
      
      gateway.broadcastSeatUpdate(venueMapId, seatId, status);
      
      expect(mockServer.to).toHaveBeenCalledWith(venueMapId);
      expect(mockServer.emit).toHaveBeenCalledWith('seat-status-changed', {
        seatId,
        status,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('broadcastReservationExpiring', () => {
    it('should broadcast reservation expiring warning', () => {
      const venueMapId = 'venue-1';
      const seatId = 'seat-1';
      const expiresAt = new Date();
      
      gateway.broadcastReservationExpiring(venueMapId, seatId, expiresAt);
      
      expect(mockServer.to).toHaveBeenCalledWith(venueMapId);
      expect(mockServer.emit).toHaveBeenCalledWith('reservation-expiring', {
        seatId,
        expiresAt,
        warningTime: expect.any(Date)
      });
    });
  });

  describe('notifyGroupBookingUpdate', () => {
    it('should notify group booking participants of updates', () => {
      const groupBookingId = 'group-1';
      const updateData = {
        status: 'confirmed',
        seatsAssigned: ['seat-1', 'seat-2']
      };
      
      gateway.notifyGroupBookingUpdate(groupBookingId, updateData);
      
      expect(mockServer.to).toHaveBeenCalledWith(`group-${groupBookingId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('group-booking-update', updateData);
    });
  });
});
