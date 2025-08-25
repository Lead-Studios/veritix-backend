import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EnhancedSeat, EnhancedSeatStatus } from '../entities/enhanced-seat.entity';
import { SeatReservation, ReservationStatus, ReservationType } from '../entities/seat-reservation.entity';
import { VenueMap } from '../entities/venue-map.entity';
import { SeatPricingTier } from '../entities/seat-pricing-tier.entity';

@Injectable()
export class SeatSelectionService {
  private readonly logger = new Logger(SeatSelectionService.name);
  private readonly RESERVATION_TIMEOUT_MINUTES = 15;

  constructor(
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    @InjectRepository(SeatReservation)
    private readonly seatReservationRepository: Repository<SeatReservation>,
    @InjectRepository(VenueMap)
    private readonly venueMapRepository: Repository<VenueMap>,
    @InjectRepository(SeatPricingTier)
    private readonly seatPricingTierRepository: Repository<SeatPricingTier>,
    @InjectQueue('seat-reservation')
    private readonly seatReservationQueue: Queue,
  ) {}

  async selectSeat(seatId: string, sessionId: string, userId?: string): Promise<{
    success: boolean;
    message?: string;
    reservedUntil?: Date;
    price?: number;
  }> {
    try {
      const seat = await this.enhancedSeatRepository.findOne({
        where: { id: seatId },
        relations: ['pricingTier'],
      });

      if (!seat) {
        return { success: false, message: 'Seat not found' };
      }

      if (!seat.isSelectable || !seat.isActive) {
        return { success: false, message: 'Seat is not selectable' };
      }

      if (seat.status !== EnhancedSeatStatus.AVAILABLE) {
        return { success: false, message: 'Seat is not available' };
      }

      // Check if seat is already held by this session
      const existingReservation = await this.seatReservationRepository.findOne({
        where: {
          seatId,
          sessionId,
          status: ReservationStatus.ACTIVE,
        },
      });

      if (existingReservation) {
        return {
          success: true,
          message: 'Seat already selected by this session',
          reservedUntil: existingReservation.expiresAt,
          price: existingReservation.reservedPrice,
        };
      }

      // Create reservation
      const expiresAt = new Date(Date.now() + this.RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
      const reservedPrice = seat.effectivePrice;

      const reservation = this.seatReservationRepository.create({
        seatId,
        venueMapId: seat.venueMapId,
        sessionId,
        userId,
        status: ReservationStatus.ACTIVE,
        type: ReservationType.TEMPORARY,
        expiresAt,
        reservedPrice,
        metadata: {
          selectionTime: new Date(),
        },
      });

      await this.seatReservationRepository.save(reservation);

      // Update seat status
      await this.enhancedSeatRepository.update(seatId, {
        status: EnhancedSeatStatus.HELD,
        heldUntil: expiresAt,
        holdReference: sessionId,
        lastSelectedAt: new Date(),
        selectionCount: seat.selectionCount + 1,
      });

      // Schedule cleanup job
      await this.seatReservationQueue.add(
        'cleanup-expired-reservations',
        { reservationId: reservation.id },
        { delay: this.RESERVATION_TIMEOUT_MINUTES * 60 * 1000 }
      );

      this.logger.log(`Seat ${seatId} selected by session ${sessionId}`);

      return {
        success: true,
        reservedUntil: expiresAt,
        price: reservedPrice,
      };
    } catch (error) {
      this.logger.error(`Error selecting seat: ${error.message}`);
      return { success: false, message: 'Failed to select seat' };
    }
  }

  async deselectSeat(seatId: string, sessionId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const reservation = await this.seatReservationRepository.findOne({
        where: {
          seatId,
          sessionId,
          status: ReservationStatus.ACTIVE,
        },
      });

      if (!reservation) {
        return { success: false, message: 'No active reservation found' };
      }

      // Update reservation status
      await this.seatReservationRepository.update(reservation.id, {
        status: ReservationStatus.CANCELLED,
      });

      // Update seat status
      await this.enhancedSeatRepository.update(seatId, {
        status: EnhancedSeatStatus.AVAILABLE,
        heldUntil: null,
        holdReference: null,
      });

      this.logger.log(`Seat ${seatId} deselected by session ${sessionId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error deselecting seat: ${error.message}`);
      return { success: false, message: 'Failed to deselect seat' };
    }
  }

  async getSeatAvailability(venueMapId: string): Promise<{
    totalSeats: number;
    availableSeats: number;
    soldSeats: number;
    heldSeats: number;
    seatsByStatus: Record<string, number>;
    lastUpdated: Date;
  }> {
    const counts = await this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .select('seat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('seat.venueMapId = :venueMapId', { venueMapId })
      .andWhere('seat.isActive = :isActive', { isActive: true })
      .groupBy('seat.status')
      .getRawMany();

    const seatsByStatus = counts.reduce((acc, { status, count }) => {
      acc[status] = parseInt(count);
      return acc;
    }, {});

    const totalSeats = Object.values(seatsByStatus).reduce((sum: number, count: number) => sum + count, 0);
    const availableSeats = seatsByStatus[EnhancedSeatStatus.AVAILABLE] || 0;
    const soldSeats = seatsByStatus[EnhancedSeatStatus.SOLD] || 0;
    const heldSeats = (seatsByStatus[EnhancedSeatStatus.HELD] || 0) + (seatsByStatus[EnhancedSeatStatus.RESERVED] || 0);

    return {
      totalSeats,
      availableSeats,
      soldSeats,
      heldSeats,
      seatsByStatus,
      lastUpdated: new Date(),
    };
  }

  async getSeatDetails(seatId: string): Promise<any> {
    const seat = await this.enhancedSeatRepository.findOne({
      where: { id: seatId },
      relations: ['pricingTier', 'venueMap'],
    });

    if (!seat) {
      throw new NotFoundException(`Seat ${seatId} not found`);
    }

    const activeReservation = await this.seatReservationRepository.findOne({
      where: {
        seatId,
        status: ReservationStatus.ACTIVE,
      },
    });

    return {
      id: seat.id,
      sectionId: seat.sectionId,
      sectionName: seat.sectionName,
      row: seat.row,
      number: seat.number,
      label: seat.displayLabel,
      status: seat.status,
      type: seat.type,
      accessibilityType: seat.accessibilityType,
      basePrice: seat.basePrice,
      currentPrice: seat.effectivePrice,
      position: seat.position,
      features: seat.features,
      restrictions: seat.restrictions,
      isSelectable: seat.isSelectable && seat.isAvailable,
      popularityScore: seat.popularityScore,
      selectionCount: seat.selectionCount,
      lastSelectedAt: seat.lastSelectedAt,
      pricingTier: seat.pricingTier ? {
        id: seat.pricingTier.id,
        name: seat.pricingTier.name,
        tierType: seat.pricingTier.tierType,
        colorCode: seat.pricingTier.colorCode,
        benefits: seat.pricingTier.benefits,
        restrictions: seat.pricingTier.restrictions,
      } : null,
      reservation: activeReservation ? {
        id: activeReservation.id,
        sessionId: activeReservation.sessionId,
        expiresAt: activeReservation.expiresAt,
        reservedPrice: activeReservation.reservedPrice,
        remainingTime: activeReservation.remainingTime,
      } : null,
      adjacentSeats: seat.adjacentSeats,
    };
  }

  async getSelectedSeats(sessionId: string): Promise<any[]> {
    const reservations = await this.seatReservationRepository.find({
      where: {
        sessionId,
        status: ReservationStatus.ACTIVE,
      },
      relations: ['seat', 'seat.pricingTier'],
    });

    return reservations.map(reservation => ({
      reservationId: reservation.id,
      seat: {
        id: reservation.seat.id,
        sectionName: reservation.seat.sectionName,
        row: reservation.seat.row,
        number: reservation.seat.number,
        label: reservation.seat.displayLabel,
        type: reservation.seat.type,
        accessibilityType: reservation.seat.accessibilityType,
      },
      price: reservation.reservedPrice,
      expiresAt: reservation.expiresAt,
      remainingTime: reservation.remainingTime,
      canExtend: reservation.canExtend,
    }));
  }

  async findBestAvailableSeats(
    venueMapId: string,
    quantity: number,
    preferences?: {
      sectionPreferences?: string[];
      priceRange?: { min: number; max: number };
      accessibilityRequired?: boolean;
      adjacentRequired?: boolean;
      maxRowSpread?: number;
    }
  ): Promise<EnhancedSeat[]> {
    let query = this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.pricingTier', 'pricingTier')
      .where('seat.venueMapId = :venueMapId', { venueMapId })
      .andWhere('seat.status = :status', { status: EnhancedSeatStatus.AVAILABLE })
      .andWhere('seat.isSelectable = :isSelectable', { isSelectable: true })
      .andWhere('seat.isActive = :isActive', { isActive: true });

    if (preferences?.sectionPreferences?.length) {
      query = query.andWhere('seat.sectionId IN (:...sections)', { 
        sections: preferences.sectionPreferences 
      });
    }

    if (preferences?.priceRange) {
      query = query.andWhere('seat.basePrice BETWEEN :minPrice AND :maxPrice', {
        minPrice: preferences.priceRange.min,
        maxPrice: preferences.priceRange.max,
      });
    }

    if (preferences?.accessibilityRequired) {
      query = query.andWhere('seat.accessibilityType != :none', { none: 'none' });
    }

    // Order by popularity and price
    query = query.orderBy('seat.popularityScore', 'DESC')
                 .addOrderBy('seat.basePrice', 'ASC');

    const availableSeats = await query.getMany();

    if (availableSeats.length < quantity) {
      return availableSeats.slice(0, quantity);
    }

    if (preferences?.adjacentRequired) {
      return this.findAdjacentSeats(availableSeats, quantity, preferences.maxRowSpread);
    }

    return availableSeats.slice(0, quantity);
  }

  private findAdjacentSeats(
    availableSeats: EnhancedSeat[],
    quantity: number,
    maxRowSpread: number = 2
  ): EnhancedSeat[] {
    // Group seats by section and row
    const seatsByRow = new Map<string, EnhancedSeat[]>();
    
    for (const seat of availableSeats) {
      const rowKey = `${seat.sectionId}-${seat.row}`;
      if (!seatsByRow.has(rowKey)) {
        seatsByRow.set(rowKey, []);
      }
      seatsByRow.get(rowKey).push(seat);
    }

    // Sort seats within each row by seat number
    for (const [rowKey, seats] of seatsByRow.entries()) {
      seats.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    }

    // Find consecutive seats
    for (const [rowKey, seats] of seatsByRow.entries()) {
      const consecutiveGroups = this.findConsecutiveSeats(seats, quantity);
      if (consecutiveGroups.length > 0) {
        return consecutiveGroups[0]; // Return first group found
      }
    }

    // If no consecutive seats in same row, try to find seats in adjacent rows
    if (maxRowSpread > 1) {
      return this.findSeatsAcrossRows(seatsByRow, quantity, maxRowSpread);
    }

    // Fallback: return best available seats
    return availableSeats.slice(0, quantity);
  }

  private findConsecutiveSeats(seats: EnhancedSeat[], quantity: number): EnhancedSeat[][] {
    const consecutiveGroups: EnhancedSeat[][] = [];
    
    for (let i = 0; i <= seats.length - quantity; i++) {
      const group: EnhancedSeat[] = [seats[i]];
      
      for (let j = i + 1; j < seats.length && group.length < quantity; j++) {
        const currentSeat = seats[j];
        const lastSeat = group[group.length - 1];
        
        if (parseInt(currentSeat.number) === parseInt(lastSeat.number) + 1) {
          group.push(currentSeat);
        } else {
          break;
        }
      }
      
      if (group.length === quantity) {
        consecutiveGroups.push(group);
      }
    }
    
    return consecutiveGroups;
  }

  private findSeatsAcrossRows(
    seatsByRow: Map<string, EnhancedSeat[]>,
    quantity: number,
    maxRowSpread: number
  ): EnhancedSeat[] {
    const rowKeys = Array.from(seatsByRow.keys());
    const selectedSeats: EnhancedSeat[] = [];
    
    // Try to distribute seats across adjacent rows
    let remainingQuantity = quantity;
    let rowsUsed = 0;
    
    for (const rowKey of rowKeys) {
      if (rowsUsed >= maxRowSpread || remainingQuantity === 0) break;
      
      const rowSeats = seatsByRow.get(rowKey);
      const seatsToTake = Math.min(remainingQuantity, rowSeats.length);
      
      selectedSeats.push(...rowSeats.slice(0, seatsToTake));
      remainingQuantity -= seatsToTake;
      rowsUsed++;
    }
    
    return selectedSeats;
  }

  async markSeatAsSold(seatId: string, orderId: string): Promise<void> {
    const seat = await this.enhancedSeatRepository.findOne({
      where: { id: seatId },
    });

    if (!seat) {
      throw new NotFoundException(`Seat ${seatId} not found`);
    }

    // Update seat status
    await this.enhancedSeatRepository.update(seatId, {
      status: EnhancedSeatStatus.SOLD,
      heldUntil: null,
      holdReference: null,
    });

    // Update any active reservations
    await this.seatReservationRepository.update(
      { seatId, status: ReservationStatus.ACTIVE },
      { 
        status: ReservationStatus.COMPLETED,
        completedAt: new Date(),
        completionReference: orderId,
      }
    );

    this.logger.log(`Seat ${seatId} marked as sold for order ${orderId}`);
  }

  async bulkUpdateSeatStatus(
    seatIds: string[],
    status: EnhancedSeatStatus,
    metadata?: any
  ): Promise<void> {
    await this.enhancedSeatRepository.update(
      { id: { $in: seatIds } as any },
      { 
        status,
        ...(status === EnhancedSeatStatus.AVAILABLE && {
          heldUntil: null,
          holdReference: null,
        }),
        ...(metadata && { notes: JSON.stringify(metadata) }),
      }
    );

    this.logger.log(`Bulk updated ${seatIds.length} seats to status: ${status}`);
  }
}
