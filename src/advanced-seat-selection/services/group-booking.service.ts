import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GroupBooking, GroupBookingStatus, GroupBookingType } from '../entities/group-booking.entity';
import { EnhancedSeat, EnhancedSeatStatus } from '../entities/enhanced-seat.entity';
import { SeatSelectionService } from './seat-selection.service';
import { SeatReservationService } from './seat-reservation.service';
import { SeatSelectionGateway } from '../gateways/seat-selection.gateway';

@Injectable()
export class GroupBookingService {
  private readonly logger = new Logger(GroupBookingService.name);
  private readonly DEFAULT_TIMEOUT_MINUTES = 30;

  constructor(
    @InjectRepository(GroupBooking)
    private readonly groupBookingRepository: Repository<GroupBooking>,
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    private readonly seatSelectionService: SeatSelectionService,
    private readonly seatReservationService: SeatReservationService,
    private readonly seatSelectionGateway: SeatSelectionGateway,
  ) {}

  async createGroupBooking(groupBookingData: {
    venueMapId: string;
    sessionId: string;
    userId?: string;
    groupName: string;
    requestedSeats: number;
    bookingType: GroupBookingType;
    preferences?: any;
    contactInfo?: any;
  }): Promise<GroupBooking> {
    const expiresAt = new Date(Date.now() + this.DEFAULT_TIMEOUT_MINUTES * 60 * 1000);

    const groupBooking = this.groupBookingRepository.create({
      ...groupBookingData,
      status: GroupBookingStatus.PENDING,
      confirmedSeats: 0,
      expiresAt,
      constraints: {
        mustBeAdjacent: groupBookingData.bookingType === GroupBookingType.ADJACENT,
        maxGapBetweenSeats: groupBookingData.bookingType === GroupBookingType.ADJACENT ? 0 : 2,
        allowDifferentRows: groupBookingData.bookingType !== GroupBookingType.SAME_ROW,
        allowDifferentSections: groupBookingData.bookingType === GroupBookingType.FLEXIBLE,
        prioritizePrice: false,
        prioritizeLocation: true,
      },
    });

    const savedGroupBooking = await this.groupBookingRepository.save(groupBooking);
    this.logger.log(`Created group booking: ${savedGroupBooking.id}`);

    return savedGroupBooking;
  }

  async findAndReserveSeats(groupBookingId: string): Promise<{
    success: boolean;
    message?: string;
    reservedSeats?: any[];
    fulfillmentRate?: number;
  }> {
    try {
      const groupBooking = await this.groupBookingRepository.findOne({
        where: { id: groupBookingId },
      });

      if (!groupBooking) {
        return { success: false, message: 'Group booking not found' };
      }

      if (groupBooking.isExpired) {
        return { success: false, message: 'Group booking has expired' };
      }

      // Find best available seats based on booking type and preferences
      const availableSeats = await this.findSuitableSeats(groupBooking);

      if (availableSeats.length === 0) {
        return { success: false, message: 'No suitable seats found' };
      }

      const seatsToReserve = availableSeats.slice(0, groupBooking.requestedSeats);
      const reservedSeats = [];

      // Reserve each seat
      for (const seat of seatsToReserve) {
        try {
          const reservation = await this.seatReservationService.createReservation(
            seat.id,
            groupBooking.sessionId,
            groupBooking.userId,
            'group',
            this.DEFAULT_TIMEOUT_MINUTES
          );

          // Associate seat with group booking
          await this.enhancedSeatRepository.update(seat.id, {
            groupBooking: { id: groupBookingId } as any,
          });

          reservedSeats.push({
            seatId: seat.id,
            reservationId: reservation.id,
            sectionName: seat.sectionName,
            row: seat.row,
            number: seat.number,
            price: seat.effectivePrice,
          });
        } catch (error) {
          this.logger.warn(`Failed to reserve seat ${seat.id}: ${error.message}`);
        }
      }

      // Update group booking
      const totalPrice = reservedSeats.reduce((sum, seat) => sum + seat.price, 0);
      const discountPercentage = this.calculateGroupDiscount(reservedSeats.length);
      const discountAmount = totalPrice * (discountPercentage / 100);

      await this.groupBookingRepository.update(groupBookingId, {
        confirmedSeats: reservedSeats.length,
        totalPrice,
        discountPercentage,
        discountAmount,
        status: reservedSeats.length === groupBooking.requestedSeats 
          ? GroupBookingStatus.CONFIRMED 
          : GroupBookingStatus.PARTIAL,
      });

      // Notify clients
      await this.seatSelectionGateway.notifyGroupBookingUpdate(
        groupBooking.venueMapId,
        groupBookingId,
        {
          status: reservedSeats.length === groupBooking.requestedSeats 
            ? GroupBookingStatus.CONFIRMED 
            : GroupBookingStatus.PARTIAL,
          confirmedSeats: reservedSeats.length,
          reservedSeats,
        }
      );

      const fulfillmentRate = (reservedSeats.length / groupBooking.requestedSeats) * 100;

      this.logger.log(`Group booking ${groupBookingId} reserved ${reservedSeats.length}/${groupBooking.requestedSeats} seats`);

      return {
        success: true,
        reservedSeats,
        fulfillmentRate,
      };
    } catch (error) {
      this.logger.error(`Error in group booking seat reservation: ${error.message}`);
      return { success: false, message: 'Failed to reserve seats' };
    }
  }

  async addSeatsToGroupBooking(
    groupBookingId: string,
    seatIds: string[]
  ): Promise<{
    success: boolean;
    message?: string;
    addedSeats?: number;
  }> {
    try {
      const groupBooking = await this.groupBookingRepository.findOne({
        where: { id: groupBookingId },
      });

      if (!groupBooking || groupBooking.isExpired) {
        return { success: false, message: 'Group booking not found or expired' };
      }

      const seats = await this.enhancedSeatRepository.find({
        where: { id: In(seatIds), status: EnhancedSeatStatus.AVAILABLE },
      });

      if (seats.length === 0) {
        return { success: false, message: 'No available seats found' };
      }

      let addedCount = 0;
      for (const seat of seats) {
        if (groupBooking.confirmedSeats >= groupBooking.requestedSeats) {
          break;
        }

        try {
          await this.seatReservationService.createReservation(
            seat.id,
            groupBooking.sessionId,
            groupBooking.userId,
            'group',
            this.DEFAULT_TIMEOUT_MINUTES
          );

          await this.enhancedSeatRepository.update(seat.id, {
            groupBooking: { id: groupBookingId } as any,
          });

          addedCount++;
        } catch (error) {
          this.logger.warn(`Failed to add seat ${seat.id} to group booking: ${error.message}`);
        }
      }

      // Update group booking counts and pricing
      const newConfirmedSeats = groupBooking.confirmedSeats + addedCount;
      const allReservedSeats = await this.getGroupBookingSeats(groupBookingId);
      const totalPrice = allReservedSeats.reduce((sum, seat) => sum + seat.effectivePrice, 0);
      const discountPercentage = this.calculateGroupDiscount(newConfirmedSeats);
      const discountAmount = totalPrice * (discountPercentage / 100);

      await this.groupBookingRepository.update(groupBookingId, {
        confirmedSeats: newConfirmedSeats,
        totalPrice,
        discountPercentage,
        discountAmount,
        status: newConfirmedSeats >= groupBooking.requestedSeats 
          ? GroupBookingStatus.CONFIRMED 
          : GroupBookingStatus.PARTIAL,
      });

      return {
        success: true,
        addedSeats: addedCount,
      };
    } catch (error) {
      this.logger.error(`Error adding seats to group booking: ${error.message}`);
      return { success: false, message: 'Failed to add seats' };
    }
  }

  async removeSeatsFromGroupBooking(
    groupBookingId: string,
    seatIds: string[]
  ): Promise<{
    success: boolean;
    message?: string;
    removedSeats?: number;
  }> {
    try {
      const groupBooking = await this.groupBookingRepository.findOne({
        where: { id: groupBookingId },
      });

      if (!groupBooking) {
        return { success: false, message: 'Group booking not found' };
      }

      const seats = await this.enhancedSeatRepository.find({
        where: { 
          id: In(seatIds),
          groupBooking: { id: groupBookingId } as any,
        },
      });

      let removedCount = 0;
      for (const seat of seats) {
        try {
          // Release reservation
          await this.seatReservationService.batchReleaseSeats(
            groupBooking.sessionId,
            [seat.id],
            'removed_from_group'
          );

          // Remove group booking association
          await this.enhancedSeatRepository.update(seat.id, {
            groupBooking: null,
          });

          removedCount++;
        } catch (error) {
          this.logger.warn(`Failed to remove seat ${seat.id} from group booking: ${error.message}`);
        }
      }

      // Update group booking
      const newConfirmedSeats = Math.max(0, groupBooking.confirmedSeats - removedCount);
      const remainingSeats = await this.getGroupBookingSeats(groupBookingId);
      const totalPrice = remainingSeats.reduce((sum, seat) => sum + seat.effectivePrice, 0);
      const discountPercentage = this.calculateGroupDiscount(newConfirmedSeats);
      const discountAmount = totalPrice * (discountPercentage / 100);

      await this.groupBookingRepository.update(groupBookingId, {
        confirmedSeats: newConfirmedSeats,
        totalPrice,
        discountPercentage,
        discountAmount,
        status: newConfirmedSeats === 0 
          ? GroupBookingStatus.CANCELLED
          : newConfirmedSeats < groupBooking.requestedSeats
          ? GroupBookingStatus.PARTIAL
          : GroupBookingStatus.CONFIRMED,
      });

      return {
        success: true,
        removedSeats: removedCount,
      };
    } catch (error) {
      this.logger.error(`Error removing seats from group booking: ${error.message}`);
      return { success: false, message: 'Failed to remove seats' };
    }
  }

  async getGroupBooking(groupBookingId: string): Promise<any> {
    const groupBooking = await this.groupBookingRepository.findOne({
      where: { id: groupBookingId },
      relations: ['venueMap'],
    });

    if (!groupBooking) {
      throw new NotFoundException(`Group booking ${groupBookingId} not found`);
    }

    const seats = await this.getGroupBookingSeats(groupBookingId);

    return {
      id: groupBooking.id,
      groupName: groupBooking.groupName,
      status: groupBooking.status,
      bookingType: groupBooking.bookingType,
      requestedSeats: groupBooking.requestedSeats,
      confirmedSeats: groupBooking.confirmedSeats,
      fulfillmentRate: groupBooking.fulfillmentRate,
      totalPrice: groupBooking.totalPrice,
      discountAmount: groupBooking.discountAmount,
      discountPercentage: groupBooking.discountPercentage,
      effectivePrice: groupBooking.effectivePrice,
      expiresAt: groupBooking.expiresAt,
      isExpired: groupBooking.isExpired,
      isActive: groupBooking.isActive,
      preferences: groupBooking.preferences,
      constraints: groupBooking.constraints,
      contactInfo: groupBooking.contactInfo,
      venueMap: {
        id: groupBooking.venueMap.id,
        name: groupBooking.venueMap.name,
      },
      seats: seats.map(seat => ({
        id: seat.id,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        label: seat.displayLabel,
        price: seat.effectivePrice,
        type: seat.type,
        accessibilityType: seat.accessibilityType,
      })),
      createdAt: groupBooking.createdAt,
      updatedAt: groupBooking.updatedAt,
    };
  }

  async cancelGroupBooking(groupBookingId: string, reason: string = 'user_cancelled'): Promise<void> {
    const groupBooking = await this.groupBookingRepository.findOne({
      where: { id: groupBookingId },
    });

    if (!groupBooking) {
      throw new NotFoundException(`Group booking ${groupBookingId} not found`);
    }

    // Release all associated seats
    await this.seatReservationService.batchReleaseSeats(
      groupBooking.sessionId,
      undefined, // All seats for this session
      reason
    );

    // Remove group booking associations
    await this.enhancedSeatRepository.update(
      { groupBooking: { id: groupBookingId } as any },
      { groupBooking: null }
    );

    // Update group booking status
    await this.groupBookingRepository.update(groupBookingId, {
      status: GroupBookingStatus.CANCELLED,
    });

    // Notify clients
    await this.seatSelectionGateway.notifyGroupBookingUpdate(
      groupBooking.venueMapId,
      groupBookingId,
      {
        status: GroupBookingStatus.CANCELLED,
        reason,
      }
    );

    this.logger.log(`Cancelled group booking ${groupBookingId}, reason: ${reason}`);
  }

  private async findSuitableSeats(groupBooking: GroupBooking): Promise<EnhancedSeat[]> {
    const preferences = {
      sectionPreferences: groupBooking.preferences?.sectionPreferences,
      priceRange: groupBooking.preferences?.priceRange,
      accessibilityRequired: groupBooking.preferences?.accessibilityRequired,
      adjacentRequired: groupBooking.bookingType === GroupBookingType.ADJACENT,
      maxRowSpread: groupBooking.constraints?.allowDifferentRows ? 3 : 1,
    };

    return this.seatSelectionService.findBestAvailableSeats(
      groupBooking.venueMapId,
      groupBooking.requestedSeats,
      preferences
    );
  }

  private async getGroupBookingSeats(groupBookingId: string): Promise<EnhancedSeat[]> {
    return this.enhancedSeatRepository.find({
      where: { groupBooking: { id: groupBookingId } as any },
      relations: ['pricingTier'],
    });
  }

  private calculateGroupDiscount(seatCount: number): number {
    if (seatCount >= 20) return 15; // 15% for 20+ seats
    if (seatCount >= 10) return 10; // 10% for 10+ seats
    if (seatCount >= 5) return 5;   // 5% for 5+ seats
    return 0; // No discount for less than 5 seats
  }

  async getGroupBookingStats(venueMapId?: string): Promise<any> {
    let query = this.groupBookingRepository
      .createQueryBuilder('gb')
      .select('gb.status', 'status')
      .addSelect('gb.bookingType', 'bookingType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(gb.requestedSeats)', 'avgRequestedSeats')
      .addSelect('AVG(gb.confirmedSeats)', 'avgConfirmedSeats')
      .addSelect('AVG(gb.fulfillmentRate)', 'avgFulfillmentRate')
      .addSelect('SUM(gb.totalPrice)', 'totalRevenue')
      .addSelect('SUM(gb.discountAmount)', 'totalDiscounts');

    if (venueMapId) {
      query = query.where('gb.venueMapId = :venueMapId', { venueMapId });
    }

    const stats = await query
      .groupBy('gb.status, gb.bookingType')
      .getRawMany();

    const activeBookings = await this.groupBookingRepository.count({
      where: {
        status: GroupBookingStatus.PENDING,
        ...(venueMapId && { venueMapId }),
      },
    });

    return {
      stats,
      activeBookings,
      lastUpdated: new Date(),
    };
  }
}
