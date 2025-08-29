import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HybridCheckInService } from '../services/hybrid-checkin.service';
import { HybridCheckIn } from '../entities/hybrid-checkin.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { CheckInType } from '../enums/virtual-event.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('HybridCheckInService', () => {
  let service: HybridCheckInService;
  let checkInRepository: Repository<HybridCheckIn>;
  let virtualEventRepository: Repository<VirtualEvent>;
  let attendeeRepository: Repository<VirtualEventAttendee>;

  const mockVirtualEvent = {
    id: 'test-event-id',
    status: 'live',
  };

  const mockCheckIn = {
    id: 'checkin-id',
    virtualEventId: 'test-event-id',
    userId: 'user-id',
    checkInType: CheckInType.PHYSICAL,
    checkInTime: new Date(),
    checkOutTime: null,
    isVerified: true,
  };

  const mockAttendee = {
    id: 'attendee-id',
    virtualEventId: 'test-event-id',
    userId: 'user-id',
    leftAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridCheckInService,
        {
          provide: getRepositoryToken(HybridCheckIn),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEvent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEventAttendee),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HybridCheckInService>(HybridCheckInService);
    checkInRepository = module.get<Repository<HybridCheckIn>>(getRepositoryToken(HybridCheckIn));
    virtualEventRepository = module.get<Repository<VirtualEvent>>(getRepositoryToken(VirtualEvent));
    attendeeRepository = module.get<Repository<VirtualEventAttendee>>(getRepositoryToken(VirtualEventAttendee));
  });

  describe('checkInPhysical', () => {
    it('should check in physically successfully', async () => {
      const checkInData = {
        userId: 'user-id',
        location: 'Main Hall',
        qrCodeData: 'valid-qr-code',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(service as any, 'verifyQRCode').mockResolvedValue(true);
      jest.spyOn(checkInRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(checkInRepository, 'create').mockReturnValue(mockCheckIn as any);
      jest.spyOn(checkInRepository, 'save').mockResolvedValue(mockCheckIn as any);

      const result = await service.checkInPhysical('test-event-id', checkInData);

      expect(result).toEqual(mockCheckIn);
      expect(checkInRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          virtualEventId: 'test-event-id',
          checkInType: CheckInType.PHYSICAL,
          isVerified: true,
        })
      );
    });

    it('should throw error if virtual event not found', async () => {
      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.checkInPhysical('non-existent-id', { userId: 'user-id' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid QR code', async () => {
      const checkInData = {
        userId: 'user-id',
        qrCodeData: 'invalid-qr-code',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(service as any, 'verifyQRCode').mockResolvedValue(false);

      await expect(
        service.checkInPhysical('test-event-id', checkInData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user already checked in physically', async () => {
      const checkInData = { userId: 'user-id' };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(checkInRepository, 'findOne').mockResolvedValue(mockCheckIn as any);

      await expect(
        service.checkInPhysical('test-event-id', checkInData)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkInVirtual', () => {
    it('should check in virtually successfully', async () => {
      const checkInData = { userId: 'user-id' };
      const virtualCheckIn = { ...mockCheckIn, checkInType: CheckInType.VIRTUAL };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(mockAttendee as any);
      jest.spyOn(checkInRepository, 'create').mockReturnValue(virtualCheckIn as any);
      jest.spyOn(checkInRepository, 'save').mockResolvedValue(virtualCheckIn as any);

      const result = await service.checkInVirtual('test-event-id', checkInData);

      expect(result.checkInType).toBe(CheckInType.VIRTUAL);
    });

    it('should throw error if user not in virtual event', async () => {
      const checkInData = { userId: 'user-id' };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.checkInVirtual('test-event-id', checkInData)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should check out successfully', async () => {
      const updatedCheckIn = { ...mockCheckIn, checkOutTime: new Date() };

      jest.spyOn(checkInRepository, 'findOne').mockResolvedValue(mockCheckIn as any);
      jest.spyOn(checkInRepository, 'save').mockResolvedValue(updatedCheckIn as any);

      const result = await service.checkOut('checkin-id');

      expect(result.checkOutTime).toBeTruthy();
    });

    it('should throw error if check-in not found', async () => {
      jest.spyOn(checkInRepository, 'findOne').mockResolvedValue(null);

      await expect(service.checkOut('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if already checked out', async () => {
      const checkedOutRecord = { ...mockCheckIn, checkOutTime: new Date() };

      jest.spyOn(checkInRepository, 'findOne').mockResolvedValue(checkedOutRecord as any);

      await expect(service.checkOut('checkin-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCheckInAnalytics', () => {
    it('should return analytics data', async () => {
      const mockAnalytics = [
        { type: 'physical', count: '10' },
        { type: 'virtual', count: '5' },
      ];

      const mockTimeline = [
        { hour: '2023-01-01T10:00:00Z', count: '3' },
        { hour: '2023-01-01T11:00:00Z', count: '7' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn()
          .mockResolvedValueOnce(mockAnalytics)
          .mockResolvedValueOnce(mockTimeline),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: '1800' }),
      };

      jest.spyOn(checkInRepository, 'count')
        .mockResolvedValueOnce(15) // totalCheckIns
        .mockResolvedValueOnce(8); // currentCheckIns
      jest.spyOn(checkInRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCheckInAnalytics('test-event-id');

      expect(result).toEqual({
        totalCheckIns: 15,
        currentCheckIns: 8,
        checkInsByType: {
          physical: 10,
          virtual: 5,
        },
        checkInTimeline: [
          { hour: '2023-01-01T10:00:00Z', count: 3 },
          { hour: '2023-01-01T11:00:00Z', count: 7 },
        ],
        averageDuration: 1800,
      });
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const result = await service.generateQRCode('test-event-id', 'user-id');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Verify the QR code can be decoded
      const decoded = JSON.parse(Buffer.from(result, 'base64').toString());
      expect(decoded.eventId).toBe('test-event-id');
      expect(decoded.userId).toBe('user-id');
      expect(decoded.timestamp).toBeTruthy();
      expect(decoded.signature).toBeTruthy();
    });
  });

  describe('verifyQRCode', () => {
    it('should verify valid QR code', async () => {
      // Generate a valid QR code first
      const qrCode = await service.generateQRCode('test-event-id', 'user-id');
      
      // Use reflection to access private method
      const verifyMethod = (service as any).verifyQRCode.bind(service);
      const result = await verifyMethod(qrCode, 'test-event-id');

      expect(result).toBe(true);
    });

    it('should reject QR code for different event', async () => {
      const qrCode = await service.generateQRCode('different-event-id', 'user-id');
      
      const verifyMethod = (service as any).verifyQRCode.bind(service);
      const result = await verifyMethod(qrCode, 'test-event-id');

      expect(result).toBe(false);
    });

    it('should reject invalid QR code format', async () => {
      const invalidQR = 'invalid-qr-code';
      
      const verifyMethod = (service as any).verifyQRCode.bind(service);
      const result = await verifyMethod(invalidQR, 'test-event-id');

      expect(result).toBe(false);
    });
  });
});
