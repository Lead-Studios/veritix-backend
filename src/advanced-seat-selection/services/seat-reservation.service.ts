import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SeatReservation, ReservationStatus, ReservationType } from '../entities/seat-reservation.entity';
import { EnhancedSeat, EnhancedSeatStatus } from '../entities/enhanced-seat.entity';
import { SeatSelectionGateway } from '../gateways/seat-selection.gateway';

@Injectable()
export class SeatReservationService {
  private readonly logger = new Logger(SeatReservationService.name);
  private readonly DEFAULT_TIMEOUT_MINUTES = 15;
  private readonly MAX_EXTENSIONS = 3;

  constructor(
    @InjectRepository(SeatReservation)
    private readonly seatReservationRepository: Repository<SeatReservation>,
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    @InjectQueue('seat-reservation')
    private readonly seatReservationQueue: Queue,
    private readonly seatSelectionGateway: SeatSelectionGateway,
  ) {}

  async createReservation(
    seatId: string,
    sessionId: string,
    userId?: string,
    type: ReservationType = ReservationType.TEMPORARY,
    timeoutMinutes: number = this.DEFAULT_TIMEOUT_MINUTES
  ): Promise<SeatReservation> {
    const seat = await this.enhancedSeatRepository.findOne({
      where: { id: seatId },
    });

    if (!seat) {
      throw new NotFoundException(`Seat ${seatId} not found`);
    }

    if (seat.status !== EnhancedSeatStatus.AVAILABLE) {
      throw new BadRequestException(`Seat ${seatId} is not available`);
    }

    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    const reservation = this.seatReservationRepository.create({
      seatId,
      venueMapId: seat.venueMapId,
      sessionId,
      userId,
      status: ReservationStatus.ACTIVE,
      type,
      expiresAt,
      reservedPrice: seat.effectivePrice,
      metadata: {
        selectionTime: new Date(),
      },
    });

    const savedReservation = await this.seatReservationRepository.save(reservation);

    // Update seat status
    await this.enhancedSeatRepository.update(seatId, {
      status: EnhancedSeatStatus.HELD,
      heldUntil: expiresAt,
      holdReference: sessionId,
    });

    // Schedule cleanup
    await this.scheduleReservationCleanup(savedReservation.id, timeoutMinutes);

    this.logger.log(`Created reservation ${savedReservation.id} for seat ${seatId}`);
    return savedReservation;
  }

  async extendReservation(
    seatId: string,
    sessionId: string,
    extensionMinutes: number = 15
  ): Promise<{
    success: boolean;
    message?: string;
    newExpiryTime?: Date;
    extensionCount?: number;
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

      if (reservation.isExpired) {
        return { success: false, message: 'Reservation has already expired' };
      }

      if (!reservation.canExtend) {
        return { 
          success: false, 
          message: `Maximum extensions (${this.MAX_EXTENSIONS}) reached` 
        };
      }

      const newExpiryTime = new Date(Date.now() + extensionMinutes * 60 * 1000);
      
      await this.seatReservationRepository.update(reservation.id, {
        expiresAt: newExpiryTime,
        extensionCount: reservation.extensionCount + 1,
        lastExtendedAt: new Date(),
      });

      await this.enhancedSeatRepository.update(seatId, {
        heldUntil: newExpiryTime,
      });

      // Schedule new cleanup job
      await this.seatReservationQueue.add(
        'extend-reservation',
        { 
          reservationId: reservation.id,
          extensionMinutes 
        },
        { delay: extensionMinutes * 60 * 1000 }
      );

      this.logger.log(`Extended reservation ${reservation.id} until ${newExpiryTime}`);

      return {
        success: true,
        newExpiryTime,
        extensionCount: reservation.extensionCount + 1,
      };
    } catch (error) {
      this.logger.error(`Error extending reservation: ${error.message}`);
      return { success: false, message: 'Failed to extend reservation' };
    }
  }

  async releaseReservation(reservationId: string, reason: string = 'manual_release'): Promise<void> {
    const reservation = await this.seatReservationRepository.findOne({
      where: { id: reservationId },
      relations: ['seat'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    await this.seatReservationRepository.update(reservationId, {
      status: ReservationStatus.CANCELLED,
    });

    await this.enhancedSeatRepository.update(reservation.seatId, {
      status: EnhancedSeatStatus.AVAILABLE,
      heldUntil: null,
      holdReference: null,
    });

    // Notify clients
    await this.seatSelectionGateway.broadcastSeatUpdate(
      reservation.venueMapId,
      {
        seatId: reservation.seatId,
        status: EnhancedSeatStatus.AVAILABLE,
        action: 'released',
        reason,
      }
    );

    this.logger.log(`Released reservation ${reservationId}, reason: ${reason}`);
  }

  async releaseExpiredReservations(sessionId?: string): Promise<number> {
    const whereConditions: any = {
      status: ReservationStatus.ACTIVE,
      expiresAt: LessThan(new Date()),
    };

    if (sessionId) {
      whereConditions.sessionId = sessionId;
    }

    const expiredReservations = await this.seatReservationRepository.find({
      where: whereConditions,
      relations: ['seat'],
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    const reservationIds = expiredReservations.map(r => r.id);
    const seatIds = expiredReservations.map(r => r.seatId);

    // Update reservations to expired
    await this.seatReservationRepository.update(
      { id: { $in: reservationIds } as any },
      { status: ReservationStatus.EXPIRED }
    );

    // Update seats to available
    await this.enhancedSeatRepository.update(
      { id: { $in: seatIds } as any },
      {
        status: EnhancedSeatStatus.AVAILABLE,
        heldUntil: null,
        holdReference: null,
      }
    );

    // Notify clients about each expired reservation
    for (const reservation of expiredReservations) {
      await this.seatSelectionGateway.broadcastReservationExpired(
        reservation.venueMapId,
        reservation.seatId,
        reservation.sessionId
      );
    }

    this.logger.log(`Released ${expiredReservations.length} expired reservations`);
    return expiredReservations.length;
  }

  async getActiveReservations(sessionId: string): Promise<SeatReservation[]> {
    return this.seatReservationRepository.find({
      where: {
        sessionId,
        status: ReservationStatus.ACTIVE,
      },
      relations: ['seat', 'seat.pricingTier'],
      order: { createdAt: 'ASC' },
    });
  }

  async getReservationDetails(reservationId: string): Promise<any> {
    const reservation = await this.seatReservationRepository.findOne({
      where: { id: reservationId },
      relations: ['seat', 'seat.pricingTier', 'venueMap'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    return {
      id: reservation.id,
      status: reservation.status,
      type: reservation.type,
      expiresAt: reservation.expiresAt,
      remainingTime: reservation.remainingTime,
      remainingTimeMinutes: reservation.remainingTimeMinutes,
      reservedPrice: reservation.reservedPrice,
      extensionCount: reservation.extensionCount,
      canExtend: reservation.canExtend,
      isExpired: reservation.isExpired,
      isActive: reservation.isActive,
      seat: {
        id: reservation.seat.id,
        sectionName: reservation.seat.sectionName,
        row: reservation.seat.row,
        number: reservation.seat.number,
        label: reservation.seat.displayLabel,
        type: reservation.seat.type,
        accessibilityType: reservation.seat.accessibilityType,
        features: reservation.seat.features,
      },
      venueMap: {
        id: reservation.venueMap.id,
        name: reservation.venueMap.name,
      },
      metadata: reservation.metadata,
      createdAt: reservation.createdAt,
      lastExtendedAt: reservation.lastExtendedAt,
    };
  }

  async completeReservation(
    reservationId: string,
    completionReference: string
  ): Promise<void> {
    const reservation = await this.seatReservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    await this.seatReservationRepository.update(reservationId, {
      status: ReservationStatus.COMPLETED,
      completedAt: new Date(),
      completionReference,
    });

    await this.enhancedSeatRepository.update(reservation.seatId, {
      status: EnhancedSeatStatus.SOLD,
      heldUntil: null,
      holdReference: null,
    });

    // Notify clients that seat is sold
    await this.seatSelectionGateway.broadcastSeatSold(
      reservation.venueMapId,
      reservation.seatId
    );

    this.logger.log(`Completed reservation ${reservationId} with reference ${completionReference}`);
  }

  async batchReleaseSeats(
    sessionId: string,
    seatIds?: string[],
    reason: string = 'batch_release'
  ): Promise<number> {
    const whereConditions: any = {
      sessionId,
      status: ReservationStatus.ACTIVE,
    };

    if (seatIds?.length) {
      whereConditions.seatId = { $in: seatIds } as any;
    }

    const reservations = await this.seatReservationRepository.find({
      where: whereConditions,
      relations: ['seat'],
    });

    if (reservations.length === 0) {
      return 0;
    }

    // Queue batch release job
    await this.seatReservationQueue.add('batch-release-seats', {
      sessionId,
      seatIds: reservations.map(r => r.seatId),
      reason,
    });

    return reservations.length;
  }

  async getReservationStats(venueMapId?: string): Promise<any> {
    let query = this.seatReservationRepository
      .createQueryBuilder('reservation')
      .select('reservation.status', 'status')
      .addSelect('reservation.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(reservation.reservedPrice)', 'avgPrice')
      .addSelect('SUM(reservation.reservedPrice)', 'totalValue');

    if (venueMapId) {
      query = query.where('reservation.venueMapId = :venueMapId', { venueMapId });
    }

    const stats = await query
      .groupBy('reservation.status, reservation.type')
      .getRawMany();

    const activeReservations = await this.seatReservationRepository.count({
      where: {
        status: ReservationStatus.ACTIVE,
        ...(venueMapId && { venueMapId }),
      },
    });

    const expiredReservations = await this.seatReservationRepository.count({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
        ...(venueMapId && { venueMapId }),
      },
    });

    return {
      stats,
      activeReservations,
      expiredReservations,
      lastUpdated: new Date(),
    };
  }

  private async scheduleReservationCleanup(
    reservationId: string,
    timeoutMinutes: number
  ): Promise<void> {
    await this.seatReservationQueue.add(
      'cleanup-expired-reservations',
      { reservationId },
      { delay: timeoutMinutes * 60 * 1000 }
    );
  }

  async upgradeReservationType(
    reservationId: string,
    newType: ReservationType,
    extensionMinutes?: number
  ): Promise<void> {
    const reservation = await this.seatReservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    const updateData: any = { type: newType };

    if (extensionMinutes) {
      updateData.expiresAt = new Date(Date.now() + extensionMinutes * 60 * 1000);
      
      // Update seat hold time as well
      await this.enhancedSeatRepository.update(reservation.seatId, {
        heldUntil: updateData.expiresAt,
      });
    }

    await this.seatReservationRepository.update(reservationId, updateData);

    this.logger.log(`Upgraded reservation ${reservationId} to type: ${newType}`);
  }
}
