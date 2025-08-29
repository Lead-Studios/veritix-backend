import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ServiceBooking, BookingStatus } from '../entities/service-booking.entity';
import { BookingPayment, PaymentStatus } from '../entities/booking-payment.entity';
import { ServiceListing } from '../entities/service-listing.entity';
import { Vendor } from '../entities/vendor.entity';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { CommissionService } from './commission.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(ServiceBooking)
    private bookingRepository: Repository<ServiceBooking>,
    @InjectRepository(BookingPayment)
    private paymentRepository: Repository<BookingPayment>,
    @InjectRepository(ServiceListing)
    private serviceRepository: Repository<ServiceListing>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    private commissionService: CommissionService,
  ) {}

  async createBooking(createBookingDto: CreateBookingDto): Promise<ServiceBooking> {
    const service = await this.serviceRepository.findOne({
      where: { id: createBookingDto.serviceId, isActive: true },
      relations: ['vendor', 'pricing'],
    });

    if (!service) {
      throw new NotFoundException('Service not found or inactive');
    }

    if (!service.vendor.isActive) {
      throw new BadRequestException('Vendor is not active');
    }

    // Check availability
    const conflictingBooking = await this.checkAvailability(
      createBookingDto.serviceId,
      createBookingDto.eventDate,
      createBookingDto.startTime,
      createBookingDto.endTime,
    );

    if (conflictingBooking) {
      throw new BadRequestException('Service is not available at the requested time');
    }

    // Generate unique booking number
    const bookingNumber = await this.generateBookingNumber();

    // Calculate pricing
    const pricing = await this.calculateBookingPrice(createBookingDto, service);

    const booking = this.bookingRepository.create({
      ...createBookingDto,
      bookingNumber,
      vendorId: service.vendorId,
      ...pricing,
      status: BookingStatus.PENDING,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Create commission record
    await this.commissionService.createCommissionForBooking(savedBooking);

    return this.findBookingById(savedBooking.id);
  }

  async findBookings(query: BookingQueryDto): Promise<{
    bookings: ServiceBooking[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      vendorId,
      organizerId,
      eventId,
      dateRange,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.organizer', 'organizer')
      .leftJoinAndSelect('booking.vendor', 'vendor')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.event', 'event')
      .leftJoinAndSelect('booking.payments', 'payments');

    // Apply filters
    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('booking.status IN (:...statuses)', { statuses: status });
      } else {
        queryBuilder.andWhere('booking.status = :status', { status });
      }
    }

    if (vendorId) {
      queryBuilder.andWhere('booking.vendorId = :vendorId', { vendorId });
    }

    if (organizerId) {
      queryBuilder.andWhere('booking.organizerId = :organizerId', { organizerId });
    }

    if (eventId) {
      queryBuilder.andWhere('booking.eventId = :eventId', { eventId });
    }

    if (dateRange) {
      queryBuilder.andWhere('booking.eventDate BETWEEN :startDate AND :endDate', {
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`booking.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [bookings, total] = await queryBuilder.getManyAndCount();

    return {
      bookings,
      total,
      page,
      limit,
    };
  }

  async findBookingById(id: string): Promise<ServiceBooking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'organizer',
        'vendor',
        'vendor.profile',
        'service',
        'service.category',
        'event',
        'pricing',
        'payments',
        'commission',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findBookingByNumber(bookingNumber: string): Promise<ServiceBooking> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingNumber },
      relations: [
        'organizer',
        'vendor',
        'service',
        'event',
        'payments',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateBooking(id: string, updateBookingDto: UpdateBookingDto): Promise<ServiceBooking> {
    const booking = await this.findBookingById(id);

    // Check if booking can be updated
    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled booking');
    }

    // If changing date/time, check availability
    if (
      updateBookingDto.eventDate ||
      updateBookingDto.startTime ||
      updateBookingDto.endTime
    ) {
      const eventDate = updateBookingDto.eventDate || booking.eventDate;
      const startTime = updateBookingDto.startTime || booking.startTime;
      const endTime = updateBookingDto.endTime || booking.endTime;

      const conflictingBooking = await this.checkAvailability(
        booking.serviceId,
        eventDate,
        startTime,
        endTime,
        id, // Exclude current booking
      );

      if (conflictingBooking) {
        throw new BadRequestException('Service is not available at the requested time');
      }
    }

    // Recalculate pricing if relevant fields changed
    if (
      updateBookingDto.guestCount ||
      updateBookingDto.selectedAddOns ||
      updateBookingDto.appliedDiscounts
    ) {
      const service = await this.serviceRepository.findOne({
        where: { id: booking.serviceId },
        relations: ['pricing'],
      });

      const pricing = await this.calculateBookingPrice(
        { ...booking, ...updateBookingDto },
        service,
      );

      Object.assign(updateBookingDto, pricing);
    }

    Object.assign(booking, updateBookingDto);
    return this.bookingRepository.save(booking);
  }

  async confirmBooking(id: string): Promise<ServiceBooking> {
    const booking = await this.findBookingById(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    booking.status = BookingStatus.CONFIRMED;
    booking.confirmedAt = new Date();

    const updatedBooking = await this.bookingRepository.save(booking);

    // Update service and vendor stats
    await this.updateServiceStats(booking.serviceId);
    await this.updateVendorStats(booking.vendorId);

    return updatedBooking;
  }

  async completeBooking(id: string): Promise<ServiceBooking> {
    const booking = await this.findBookingById(id);

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Only confirmed or in-progress bookings can be completed');
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();

    const updatedBooking = await this.bookingRepository.save(booking);

    // Process commission payment
    await this.commissionService.processCommissionPayment(booking.commission.id);

    return updatedBooking;
  }

  async cancelBooking(
    id: string,
    reason: string,
    cancelledBy: 'organizer' | 'vendor' | 'admin',
  ): Promise<ServiceBooking> {
    const booking = await this.findBookingById(id);

    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot cancel completed or already cancelled booking');
    }

    // Calculate cancellation fee based on timing and policy
    const cancellationFee = await this.calculateCancellationFee(booking);

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    booking.cancellationFee = cancellationFee;

    const updatedBooking = await this.bookingRepository.save(booking);

    // Process refund if applicable
    if (booking.payments && booking.payments.length > 0) {
      await this.processRefund(booking, cancellationFee);
    }

    return updatedBooking;
  }

  async getBookingsByDateRange(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ServiceBooking[]> {
    return this.bookingRepository.find({
      where: {
        vendorId,
        eventDate: Between(startDate, endDate),
        status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
      },
      relations: ['service', 'organizer'],
      order: { eventDate: 'ASC', startTime: 'ASC' },
    });
  }

  async getUpcomingBookings(
    vendorId: string,
    limit: number = 10,
  ): Promise<ServiceBooking[]> {
    const today = new Date();
    
    return this.bookingRepository.find({
      where: {
        vendorId,
        eventDate: Between(today, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)), // Next 30 days
        status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
      },
      relations: ['service', 'organizer', 'event'],
      order: { eventDate: 'ASC', startTime: 'ASC' },
      take: limit,
    });
  }

  private async checkAvailability(
    serviceId: string,
    eventDate: Date,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<ServiceBooking | null> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.serviceId = :serviceId', { serviceId })
      .andWhere('booking.eventDate = :eventDate', { eventDate })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .andWhere(
        '(booking.startTime < :endTime AND booking.endTime > :startTime)',
        { startTime, endTime },
      );

    if (excludeBookingId) {
      queryBuilder.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    return queryBuilder.getOne();
  }

  private async generateBookingNumber(): Promise<string> {
    const prefix = 'BK';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    let bookingNumber = `${prefix}${timestamp}${random}`;
    
    // Ensure uniqueness
    while (await this.bookingRepository.findOne({ where: { bookingNumber } })) {
      const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      bookingNumber = `${prefix}${timestamp}${newRandom}`;
    }
    
    return bookingNumber;
  }

  private async calculateBookingPrice(
    bookingData: any,
    service: ServiceListing,
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    serviceFee: number;
    travelFee: number;
    totalAmount: number;
  }> {
    let subtotal = 0;
    
    // Get base price from selected pricing or default pricing
    const pricing = bookingData.pricingId
      ? service.pricing.find(p => p.id === bookingData.pricingId)
      : service.pricing.find(p => p.isDefault) || service.pricing[0];

    if (pricing) {
      subtotal = parseFloat(pricing.basePrice.toString());

      // Apply guest count pricing if applicable
      if (pricing.capacity?.pricePerGuest && bookingData.guestCount) {
        subtotal += pricing.capacity.pricePerGuest * bookingData.guestCount;
      }
    }

    // Add selected add-ons
    if (bookingData.selectedAddOns) {
      for (const addOn of bookingData.selectedAddOns) {
        subtotal += addOn.price * (addOn.quantity || 1);
      }
    }

    // Apply discounts
    if (bookingData.appliedDiscounts) {
      for (const discount of bookingData.appliedDiscounts) {
        if (discount.type === 'percentage') {
          subtotal -= subtotal * (discount.value / 100);
        } else {
          subtotal -= discount.value;
        }
      }
    }

    // Calculate fees
    const taxRate = 0.08; // 8% tax rate (should be configurable)
    const serviceFeeRate = 0.03; // 3% service fee
    
    const taxAmount = subtotal * taxRate;
    const serviceFee = subtotal * serviceFeeRate;
    const travelFee = bookingData.travelFee || 0;
    
    const totalAmount = subtotal + taxAmount + serviceFee + travelFee;

    return {
      subtotal,
      taxAmount,
      serviceFee,
      travelFee,
      totalAmount,
    };
  }

  private async calculateCancellationFee(booking: ServiceBooking): Promise<number> {
    const now = new Date();
    const eventDate = new Date(booking.eventDate);
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Cancellation policy based on timing
    if (hoursUntilEvent > 168) { // More than 7 days
      return 0; // No fee
    } else if (hoursUntilEvent > 72) { // 3-7 days
      return booking.totalAmount * 0.25; // 25% fee
    } else if (hoursUntilEvent > 24) { // 1-3 days
      return booking.totalAmount * 0.50; // 50% fee
    } else {
      return booking.totalAmount * 0.75; // 75% fee
    }
  }

  private async processRefund(booking: ServiceBooking, cancellationFee: number): Promise<void> {
    const totalPaid = booking.payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const refundAmount = totalPaid - cancellationFee;

    if (refundAmount > 0) {
      // Create refund payment record
      const refundPayment = this.paymentRepository.create({
        bookingId: booking.id,
        transactionId: `REF-${Date.now()}`,
        status: PaymentStatus.PENDING,
        paymentType: 'refund',
        paymentMethod: 'refund',
        amount: refundAmount,
        currency: booking.currency,
        description: `Refund for cancelled booking ${booking.bookingNumber}`,
      });

      await this.paymentRepository.save(refundPayment);
      
      // TODO: Integrate with payment processor to process actual refund
    }
  }

  private async updateServiceStats(serviceId: string): Promise<void> {
    const bookingCount = await this.bookingRepository.count({
      where: {
        serviceId,
        status: In([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
      },
    });

    await this.serviceRepository.update(serviceId, {
      totalBookings: bookingCount,
    });
  }

  private async updateVendorStats(vendorId: string): Promise<void> {
    const stats = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COUNT(booking.id)', 'totalBookings')
      .addSelect('SUM(booking.totalAmount)', 'totalRevenue')
      .where('booking.vendorId = :vendorId', { vendorId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .getRawOne();

    await this.vendorRepository.update(vendorId, {
      totalBookings: parseInt(stats.totalBookings) || 0,
      totalRevenue: parseFloat(stats.totalRevenue) || 0,
      lastActiveAt: new Date(),
    });
  }
}
