import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeatReservation, ReservationStatus } from '../entities/seat-reservation.entity';
import { EnhancedSeat, EnhancedSeatStatus } from '../entities/enhanced-seat.entity';
import { SeatSelectionGateway } from '../gateways/seat-selection.gateway';

@Injectable()
@Processor('seat-reservation')
export class SeatReservationProcessor {
  private readonly logger = new Logger(SeatReservationProcessor.name);

  constructor(
    @InjectRepository(SeatReservation)
    private readonly seatReservationRepository: Repository<SeatReservation>,
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    private readonly seatSelectionGateway: SeatSelectionGateway,
  ) {}

  @Process('cleanup-expired-reservations')
  async handleCleanupExpiredReservations(job: Job) {
    this.logger.log('Processing expired reservation cleanup job');
    
    try {
      const { venueMapId, batchSize = 100 } = job.data;
      
      const expiredReservations = await this.seatReservationRepository.find({
        where: {
          status: ReservationStatus.ACTIVE,
          expiresAt: LessThan(new Date()),
          ...(venueMapId && { venueMapId }),
        },
        relations: ['seat'],
        take: batchSize,
      });

      if (expiredReservations.length === 0) {
        this.logger.log('No expired reservations found');
        return { processed: 0 };
      }

      const seatIds = expiredReservations.map(r => r.seatId);
      const venueMapIds = [...new Set(expiredReservations.map(r => r.venueMapId))];

      // Update reservation status to expired
      await this.seatReservationRepository.update(
        { id: { $in: expiredReservations.map(r => r.id) } as any },
        { status: ReservationStatus.EXPIRED }
      );

      // Update seat status back to available
      await this.enhancedSeatRepository.update(
        { id: { $in: seatIds } as any },
        { 
          status: EnhancedSeatStatus.AVAILABLE,
          heldUntil: null,
          holdReference: null,
        }
      );

      // Notify clients via WebSocket
      for (const reservation of expiredReservations) {
        await this.seatSelectionGateway.broadcastReservationExpired(
          reservation.venueMapId,
          reservation.seatId,
          reservation.sessionId
        );
      }

      // Update venue availability counts
      for (const venueId of venueMapIds) {
        await this.updateVenueAvailabilityCounts(venueId);
      }

      this.logger.log(`Cleaned up ${expiredReservations.length} expired reservations`);
      
      return { 
        processed: expiredReservations.length,
        venueMapIds: venueMapIds,
      };
    } catch (error) {
      this.logger.error(`Error cleaning up expired reservations: ${error.message}`);
      throw error;
    }
  }

  @Process('extend-reservation')
  async handleExtendReservation(job: Job) {
    this.logger.log('Processing reservation extension job');
    
    try {
      const { reservationId, extensionMinutes = 15 } = job.data;
      
      const reservation = await this.seatReservationRepository.findOne({
        where: { id: reservationId },
        relations: ['seat'],
      });

      if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found`);
      }

      if (reservation.status !== ReservationStatus.ACTIVE) {
        throw new Error(`Reservation ${reservationId} is not active`);
      }

      if (reservation.extensionCount >= 3) {
        throw new Error(`Maximum extensions reached for reservation ${reservationId}`);
      }

      const newExpiryTime = new Date(Date.now() + extensionMinutes * 60 * 1000);
      
      await this.seatReservationRepository.update(reservation.id, {
        expiresAt: newExpiryTime,
        extensionCount: reservation.extensionCount + 1,
        lastExtendedAt: new Date(),
      });

      await this.enhancedSeatRepository.update(reservation.seatId, {
        heldUntil: newExpiryTime,
      });

      this.logger.log(`Extended reservation ${reservationId} until ${newExpiryTime}`);
      
      return {
        reservationId,
        newExpiryTime,
        extensionCount: reservation.extensionCount + 1,
      };
    } catch (error) {
      this.logger.error(`Error extending reservation: ${error.message}`);
      throw error;
    }
  }

  @Process('batch-release-seats')
  async handleBatchReleaseSeats(job: Job) {
    this.logger.log('Processing batch seat release job');
    
    try {
      const { sessionId, seatIds, reason = 'batch_release' } = job.data;
      
      const reservations = await this.seatReservationRepository.find({
        where: {
          sessionId,
          seatId: { $in: seatIds } as any,
          status: ReservationStatus.ACTIVE,
        },
        relations: ['seat'],
      });

      if (reservations.length === 0) {
        this.logger.log(`No active reservations found for session ${sessionId}`);
        return { released: 0 };
      }

      const reservationIds = reservations.map(r => r.id);
      const actualSeatIds = reservations.map(r => r.seatId);
      const venueMapIds = [...new Set(reservations.map(r => r.venueMapId))];

      // Update reservations to cancelled
      await this.seatReservationRepository.update(
        { id: { $in: reservationIds } as any },
        { status: ReservationStatus.CANCELLED }
      );

      // Update seats to available
      await this.enhancedSeatRepository.update(
        { id: { $in: actualSeatIds } as any },
        {
          status: EnhancedSeatStatus.AVAILABLE,
          heldUntil: null,
          holdReference: null,
        }
      );

      // Notify clients
      for (const reservation of reservations) {
        await this.seatSelectionGateway.broadcastSeatUpdate(
          reservation.venueMapId,
          {
            seatId: reservation.seatId,
            status: EnhancedSeatStatus.AVAILABLE,
            action: 'released',
            reason,
          }
        );
      }

      // Update venue availability counts
      for (const venueId of venueMapIds) {
        await this.updateVenueAvailabilityCounts(venueId);
      }

      this.logger.log(`Released ${reservations.length} seats for session ${sessionId}`);
      
      return {
        released: reservations.length,
        sessionId,
        venueMapIds,
      };
    } catch (error) {
      this.logger.error(`Error in batch seat release: ${error.message}`);
      throw error;
    }
  }

  @Process('update-seat-popularity')
  async handleUpdateSeatPopularity(job: Job) {
    this.logger.log('Processing seat popularity update job');
    
    try {
      const { venueMapId, timeWindow = 30 } = job.data; // 30 days default
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

      // Get selection counts for seats in the time window
      const selectionCounts = await this.seatReservationRepository
        .createQueryBuilder('reservation')
        .select('reservation.seatId', 'seatId')
        .addSelect('COUNT(*)', 'selectionCount')
        .where('reservation.venueMapId = :venueMapId', { venueMapId })
        .andWhere('reservation.createdAt >= :cutoffDate', { cutoffDate })
        .groupBy('reservation.seatId')
        .getRawMany();

      if (selectionCounts.length === 0) {
        this.logger.log('No seat selections found in time window');
        return { updated: 0 };
      }

      // Find max selections to calculate popularity score
      const maxSelections = Math.max(...selectionCounts.map(s => parseInt(s.selectionCount)));

      // Update seat popularity scores
      let updatedCount = 0;
      for (const { seatId, selectionCount } of selectionCounts) {
        const popularityScore = maxSelections > 0 ? parseInt(selectionCount) / maxSelections : 0;
        
        await this.enhancedSeatRepository.update(seatId, {
          selectionCount: parseInt(selectionCount),
          popularityScore: Math.round(popularityScore * 100) / 100, // Round to 2 decimals
          lastSelectedAt: new Date(),
        });
        
        updatedCount++;
      }

      this.logger.log(`Updated popularity scores for ${updatedCount} seats`);
      
      return {
        updated: updatedCount,
        venueMapId,
        maxSelections,
      };
    } catch (error) {
      this.logger.error(`Error updating seat popularity: ${error.message}`);
      throw error;
    }
  }

  // Scheduled job to clean up expired reservations every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledCleanupExpiredReservations() {
    this.logger.log('Running scheduled cleanup of expired reservations');
    
    try {
      const expiredReservations = await this.seatReservationRepository.find({
        where: {
          status: ReservationStatus.ACTIVE,
          expiresAt: LessThan(new Date()),
        },
        relations: ['seat'],
        take: 500, // Process in batches
      });

      if (expiredReservations.length > 0) {
        await this.handleCleanupExpiredReservations({
          data: { batchSize: 500 }
        } as Job);
      }
    } catch (error) {
      this.logger.error(`Error in scheduled cleanup: ${error.message}`);
    }
  }

  // Scheduled job to update seat popularity every hour
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledUpdateSeatPopularity() {
    this.logger.log('Running scheduled seat popularity update');
    
    try {
      // Get all active venue maps
      const venueMapIds = await this.enhancedSeatRepository
        .createQueryBuilder('seat')
        .select('DISTINCT seat.venueMapId', 'venueMapId')
        .where('seat.isActive = :isActive', { isActive: true })
        .getRawMany();

      for (const { venueMapId } of venueMapIds) {
        await this.handleUpdateSeatPopularity({
          data: { venueMapId, timeWindow: 7 } // Weekly popularity update
        } as Job);
      }
    } catch (error) {
      this.logger.error(`Error in scheduled popularity update: ${error.message}`);
    }
  }

  private async updateVenueAvailabilityCounts(venueMapId: string) {
    try {
      const counts = await this.enhancedSeatRepository
        .createQueryBuilder('seat')
        .select('seat.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('seat.venueMapId = :venueMapId', { venueMapId })
        .andWhere('seat.isActive = :isActive', { isActive: true })
        .groupBy('seat.status')
        .getRawMany();

      const statusCounts = counts.reduce((acc, { status, count }) => {
        acc[status] = parseInt(count);
        return acc;
      }, {});

      const totalSeats = Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0);
      const availableSeats = statusCounts[EnhancedSeatStatus.AVAILABLE] || 0;
      const soldSeats = statusCounts[EnhancedSeatStatus.SOLD] || 0;
      const heldSeats = (statusCounts[EnhancedSeatStatus.HELD] || 0) + (statusCounts[EnhancedSeatStatus.RESERVED] || 0);

      // Update venue map with new counts
      await this.seatReservationRepository.manager.query(`
        UPDATE venue_maps 
        SET 
          total_seats = $1,
          available_seats = $2,
          sold_seats = $3,
          held_seats = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [totalSeats, availableSeats, soldSeats, heldSeats, venueMapId]);

      this.logger.log(`Updated venue ${venueMapId} availability counts`);
    } catch (error) {
      this.logger.error(`Error updating venue availability counts: ${error.message}`);
    }
  }
}
