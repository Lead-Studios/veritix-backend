import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingService } from '../booking.service';
import { ServiceBooking, BookingStatus } from '../../entities/service-booking.entity';
import { BookingPayment } from '../../entities/booking-payment.entity';
import { ServiceListing } from '../../entities/service-listing.entity';
import { Vendor } from '../../entities/vendor.entity';
import { CommissionService } from '../commission.service';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: jest.Mocked<Repository<ServiceBooking>>;
  let paymentRepository: jest.Mocked<Repository<BookingPayment>>;
  let serviceRepository: jest.Mocked<Repository<ServiceListing>>;
  let vendorRepository: jest.Mocked<Repository<Vendor>>;
  let commissionService: jest.Mocked<CommissionService>;

  const mockBooking = {
    id: '1',
    bookingNumber: 'BK12345',
    organizerId: 'organizer-1',
    vendorId: 'vendor-1',
    serviceId: 'service-1',
    status: BookingStatus.PENDING,
    eventDate: new Date('2024-12-01'),
    startTime: '10:00',
    endTime: '14:00',
    guestCount: 50,
    subtotal: 1000,
    totalAmount: 1080,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    id: 'service-1',
    vendorId: 'vendor-1',
    title: 'Test Service',
    isActive: true,
    vendor: {
      id: 'vendor-1',
      isActive: true,
    },
    pricing: [
      {
        id: 'pricing-1',
        basePrice: 1000,
        isDefault: true,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(ServiceBooking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BookingPayment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ServiceListing),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Vendor),
          useValue: {
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CommissionService,
          useValue: {
            createCommissionForBooking: jest.fn(),
            processCommissionPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get(getRepositoryToken(ServiceBooking));
    paymentRepository = module.get(getRepositoryToken(BookingPayment));
    serviceRepository = module.get(getRepositoryToken(ServiceListing));
    vendorRepository = module.get(getRepositoryToken(Vendor));
    commissionService = module.get(CommissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking', () => {
    const createBookingDto = {
      organizerId: 'organizer-1',
      serviceId: 'service-1',
      eventDate: new Date('2024-12-01'),
      startTime: '10:00',
      endTime: '14:00',
      guestCount: 50,
    };

    it('should create a booking successfully', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService as any);
      jest.spyOn(service as any, 'checkAvailability').mockResolvedValue(null);
      jest.spyOn(service as any, 'generateBookingNumber').mockResolvedValue('BK12345');
      jest.spyOn(service as any, 'calculateBookingPrice').mockResolvedValue({
        subtotal: 1000,
        taxAmount: 80,
        serviceFee: 30,
        travelFee: 0,
        totalAmount: 1110,
      });

      bookingRepository.create.mockReturnValue(mockBooking as any);
      bookingRepository.save.mockResolvedValue(mockBooking as any);
      commissionService.createCommissionForBooking.mockResolvedValue({} as any);
      jest.spyOn(service, 'findBookingById').mockResolvedValue(mockBooking as any);

      const result = await service.createBooking(createBookingDto);

      expect(serviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'service-1', isActive: true },
        relations: ['vendor', 'pricing'],
      });
      expect(bookingRepository.create).toHaveBeenCalled();
      expect(bookingRepository.save).toHaveBeenCalled();
      expect(commissionService.createCommissionForBooking).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if vendor is not active', async () => {
      const inactiveService = {
        ...mockService,
        vendor: { ...mockService.vendor, isActive: false },
      };
      serviceRepository.findOne.mockResolvedValue(inactiveService as any);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if service is not available', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService as any);
      jest.spyOn(service as any, 'checkAvailability').mockResolvedValue(mockBooking);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a pending booking', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      jest.spyOn(service, 'findBookingById').mockResolvedValue(pendingBooking as any);
      bookingRepository.save.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CONFIRMED,
        confirmedAt: expect.any(Date),
      } as any);

      jest.spyOn(service as any, 'updateServiceStats').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'updateVendorStats').mockResolvedValue(undefined);

      const result = await service.confirmBooking('1');

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      jest.spyOn(service, 'findBookingById').mockResolvedValue(confirmedBooking as any);

      await expect(service.confirmBooking('1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking and calculate cancellation fee', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const bookingToCancel = {
        ...mockBooking,
        eventDate: futureDate,
        payments: [],
      };

      jest.spyOn(service, 'findBookingById').mockResolvedValue(bookingToCancel as any);
      jest.spyOn(service as any, 'calculateCancellationFee').mockResolvedValue(0);
      bookingRepository.save.mockResolvedValue({
        ...bookingToCancel,
        status: BookingStatus.CANCELLED,
        cancelledAt: expect.any(Date),
        cancellationReason: 'Test reason',
        cancellationFee: 0,
      } as any);

      const result = await service.cancelBooking('1', 'Test reason', 'organizer');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(result.cancelledAt).toBeDefined();
      expect(result.cancellationReason).toBe('Test reason');
    });
  });

  describe('getUpcomingBookings', () => {
    it('should return upcoming bookings for vendor', async () => {
      const upcomingBookings = [mockBooking];
      bookingRepository.find.mockResolvedValue(upcomingBookings as any);

      const result = await service.getUpcomingBookings('vendor-1', 5);

      expect(bookingRepository.find).toHaveBeenCalledWith({
        where: {
          vendorId: 'vendor-1',
          eventDate: expect.any(Object), // Between dates
          status: expect.any(Object), // In array
        },
        relations: ['service', 'organizer', 'event'],
        order: { eventDate: 'ASC', startTime: 'ASC' },
        take: 5,
      });
      expect(result).toEqual(upcomingBookings);
    });
  });
});
