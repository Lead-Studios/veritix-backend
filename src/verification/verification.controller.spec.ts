import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationStatus } from './interfaces/verification.interface';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

const validResult = {
  status: VerificationStatus.VALID,
  isValid: true,
  message: 'Ticket is valid. Entry permitted.',
  verifiedAt: new Date(),
  verifiedBy: 'verifier-1',
};

const invalidResult = {
  status: VerificationStatus.ALREADY_USED,
  isValid: false,
  message: 'Ticket has already been used. Entry denied.',
  verifiedAt: new Date(),
  verifiedBy: 'verifier-1',
};

const mockUser = {
  id: 'user-uuid',
  email: 'organizer@test.com',
  fullName: 'Test Organizer',
  role: 'ORGANIZER',
} as any;

describe('VerificationController', () => {
  let controller: VerificationController;
  let verificationService: VerificationService;

  const mockVerifyTicket = jest.fn();
  const mockCheckIn = jest.fn();
  const mockPeek = jest.fn();
  const mockGetLogsForEvent = jest.fn();
  const mockGetStatsForEvent = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerificationService,
          useValue: {
            verifyTicket: mockVerifyTicket,
            checkIn: mockCheckIn,
            peek: mockPeek,
            getLogsForEvent: mockGetLogsForEvent,
            getStatsForEvent: mockGetStatsForEvent,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VerificationController>(VerificationController);
    verificationService = module.get<VerificationService>(VerificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /verification/verify', () => {
    it('returns 200 and result when ticket is valid', async () => {
      mockVerifyTicket.mockResolvedValue(validResult);
      const dto = { ticketCode: 'QR123', markAsUsed: false };
      const result = await controller.verify(dto, mockUser);
      expect(result).toEqual(validResult);
      expect(mockVerifyTicket).toHaveBeenCalledWith({
        ticketCode: 'QR123',
        eventId: undefined,
        verifierId: 'user-uuid',
        markAsUsed: false,
      });
    });

    it('throws UnprocessableEntityException (422) when ticket is invalid', async () => {
      mockVerifyTicket.mockResolvedValue(invalidResult);
      const dto = { ticketCode: 'QR456', markAsUsed: false };
      await expect(controller.verify(dto, mockUser)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(controller.verify(dto, mockUser)).rejects.toMatchObject({
        response: invalidResult,
      });
    });

    it('passes verifierId from body when provided', async () => {
      mockVerifyTicket.mockResolvedValue(validResult);
      const dto = {
        ticketCode: 'QR789',
        verifierId: 'custom-verifier-id',
        markAsUsed: true,
      };
      await controller.verify(dto, mockUser);
      expect(mockVerifyTicket).toHaveBeenCalledWith({
        ticketCode: 'QR789',
        eventId: undefined,
        verifierId: 'custom-verifier-id',
        markAsUsed: true,
      });
    });
  });

  describe('POST /verification/check-in', () => {
    it('returns 200 and result when check-in is valid', async () => {
      mockCheckIn.mockResolvedValue(validResult);
      const dto = { ticketCode: 'QR123' };
      const result = await controller.checkIn(dto, mockUser);
      expect(result).toEqual(validResult);
      expect(mockCheckIn).toHaveBeenCalledWith('QR123', 'user-uuid');
    });

    it('throws UnprocessableEntityException (422) when check-in is invalid', async () => {
      mockCheckIn.mockResolvedValue(invalidResult);
      const dto = { ticketCode: 'QR456' };
      await expect(controller.checkIn(dto, mockUser)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(controller.checkIn(dto, mockUser)).rejects.toMatchObject({
        response: invalidResult,
      });
    });

    it('passes verifierId from body when provided', async () => {
      mockCheckIn.mockResolvedValue(validResult);
      const dto = { ticketCode: 'QR789', verifierId: 'staff-id' };
      await controller.checkIn(dto, mockUser);
      expect(mockCheckIn).toHaveBeenCalledWith('QR789', 'staff-id');
    });
  });

  describe('GET /verification/peek/:ticketCode', () => {
    it('returns 200 and result when ticket is valid', async () => {
      mockPeek.mockResolvedValue(validResult);
      const result = await controller.peek('QR-PEEK');
      expect(result).toEqual(validResult);
      expect(mockPeek).toHaveBeenCalledWith('QR-PEEK');
    });

    it('throws UnprocessableEntityException (422) when ticket is invalid', async () => {
      mockPeek.mockResolvedValue(invalidResult);
      await expect(controller.peek('QR-BAD')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(controller.peek('QR-BAD')).rejects.toMatchObject({
        response: invalidResult,
      });
    });
  });

  describe('GET /verification/stats/:eventId', () => {
    it('returns 200 with stats object', async () => {
      const stats = {
        eventId: 'event-uuid',
        totalTickets: 100,
        verifiedCount: 25,
        remainingCount: 75,
        verificationRate: 25,
        calculatedAt: new Date(),
      };
      mockGetStatsForEvent.mockResolvedValue(stats);
      const result = await controller.getStats('event-uuid');
      expect(result).toEqual(stats);
      expect(mockGetStatsForEvent).toHaveBeenCalledWith('event-uuid');
    });
  });

  describe('GET /verification/logs/:eventId', () => {
    it('returns 200 with logs array', async () => {
      const logs = [
        {
          id: 'log-1',
          ticketCode: 'QR1',
          eventId: 'event-uuid',
          status: VerificationStatus.VALID,
          verifiedAt: new Date(),
        },
      ];
      mockGetLogsForEvent.mockResolvedValue(logs);
      const result = await controller.getLogs('event-uuid');
      expect(result).toEqual(logs);
      expect(mockGetLogsForEvent).toHaveBeenCalledWith('event-uuid');
    });
  });
});
