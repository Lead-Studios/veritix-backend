import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  VerificationResult,
  VerificationRequest,
  VerificationStatus,
  VerificationLog,
  VerificationStats,
} from './interfaces/verification.interface';
import { VerificationLog as VerificationLogEntity } from './entities/verification-log.entity';
import { TicketService } from '../tickets-inventory/services/ticket.service';
import { EventsService } from '../events/events.service';
import { TicketStatus } from '../tickets-inventory/entities/ticket.entity';
import { Ticket } from '../tickets-inventory/entities/ticket.entity';

/**
 * Verification Service for VeriTix
 *
 * This service handles ticket verification operations at events.
 * It provides methods for verifying tickets, logging verification
 * attempts, and generating verification statistics.
 *
 * Verification logic validates:
 * - Ticket existence and validity
 * - Ticket status (issued, scanned, cancelled, refunded)
 * - Event timing (started, not ended)
 * - Optional marking as used
 *
 * All database writes are transactional to ensure consistency.
 */
@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationLogEntity)
    private readonly verificationLogRepository: Repository<VerificationLogEntity>,
    private readonly ticketService: TicketService,
    private readonly eventsService: EventsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Verifies a ticket code with full validation logic.
   * Handles all 7 status outcomes and optional ticket marking.
   *
   * @param request - The verification request data
   * @returns Promise resolving to the verification result
   */
  async verifyTicket(request: VerificationRequest): Promise<VerificationResult> {
    const { ticketCode, eventId: requestEventId, verifierId, markAsUsed = false } = request;

    try {
      // 1. Look up ticket by QR code
      let ticket: Ticket | null;
      try {
        const ticketDto = await this.ticketService.findByQrCode(ticketCode);
        // Fetch full entity with relations
        const ticketRepository = this.dataSource.getRepository(Ticket);
        ticket = await ticketRepository.findOne({
          where: { qrCode: ticketCode },
          relations: ['event', 'ticketType'],
        });

        if (!ticket) {
          throw new NotFoundException(`Ticket not found`);
        }
      } catch (error) {
        // Ticket not found
        const result: VerificationResult = {
          status: VerificationStatus.INVALID,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.INVALID),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          null,
          requestEventId || 'unknown',
          VerificationStatus.INVALID,
          verifierId,
        );

        return result;
      }

      // 2. Validate ticket status - ALREADY_USED
      if (ticket.status === TicketStatus.SCANNED) {
        const result: VerificationResult = {
          status: VerificationStatus.ALREADY_USED,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.ALREADY_USED),
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.ALREADY_USED,
          verifierId,
        );

        return result;
      }

      // 3. Validate ticket status - CANCELLED
      if (ticket.status === TicketStatus.CANCELLED) {
        const result: VerificationResult = {
          status: VerificationStatus.CANCELLED,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.CANCELLED),
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.CANCELLED,
          verifierId,
        );

        return result;
      }

      // 4. Validate ticket status - REFUNDED
      if (ticket.status === TicketStatus.REFUNDED) {
        const result: VerificationResult = {
          status: VerificationStatus.INVALID,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.INVALID),
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.INVALID,
          verifierId,
        );

        return result;
      }

      // 5. Fetch the related event
      let event;
      try {
        event = await this.eventsService.getEventById(ticket.eventId);
      } catch (error) {
        const result: VerificationResult = {
          status: VerificationStatus.INVALID,
          isValid: false,
          message: 'Event not found',
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.INVALID,
          verifierId,
        );

        return result;
      }

      const now = new Date();

      // 6. Check EVENT_NOT_STARTED
      if (now < event.eventDate) {
        const result: VerificationResult = {
          status: VerificationStatus.EVENT_NOT_STARTED,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.EVENT_NOT_STARTED),
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.EVENT_NOT_STARTED,
          verifierId,
        );

        return result;
      }

      // 7. Check EVENT_ENDED
      if (now > event.eventClosingDate) {
        const result: VerificationResult = {
          status: VerificationStatus.EVENT_ENDED,
          isValid: false,
          message: this.getStatusMessage(VerificationStatus.EVENT_ENDED),
          ticket: this.mapTicketToVerifiedInfo(ticket),
          verifiedAt: new Date(),
          verifiedBy: verifierId,
        };

        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.EVENT_ENDED,
          verifierId,
        );

        return result;
      }

      // 8. If markAsUsed, scan the ticket transactionally
      if (markAsUsed) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Mark ticket as scanned
          const ticketRepo = queryRunner.manager.getRepository(Ticket);
          ticket.markAsScanned();
          await ticketRepo.save(ticket);

          // Log the verification
          const logRepo = queryRunner.manager.getRepository(VerificationLogEntity);
          await logRepo.save({
            ticketCode,
            ticketId: ticket.id,
            eventId: ticket.eventId,
            status: VerificationStatus.VALID,
            verifierId,
            verifiedAt: new Date(),
            deviceInfo: null,
          });

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } else {
        // Just log without marking as scanned
        await this.logVerificationResult(
          ticketCode,
          ticket.id,
          ticket.eventId,
          VerificationStatus.VALID,
          verifierId,
        );
      }

      // 9. Return VALID
      const result: VerificationResult = {
        status: VerificationStatus.VALID,
        isValid: true,
        message: this.getStatusMessage(VerificationStatus.VALID),
        ticket: this.mapTicketToVerifiedInfo(ticket),
        verifiedAt: new Date(),
        verifiedBy: verifierId,
      };

      return result;
    } catch (error) {
      // Handle unexpected errors
      throw new BadRequestException(
        `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verifies a ticket and marks it as used.
   * Convenience method for check-in flow.
   * @param ticketCode - The ticket code to verify
   * @param verifierId - The ID of the staff member
   * @returns Promise resolving to the verification result
   */
  checkIn(ticketCode: string, verifierId?: string): Promise<VerificationResult> {
    return this.verifyTicket({
      ticketCode,
      verifierId,
      markAsUsed: true,
    });
  }

  /**
   * Performs a verification check without marking the ticket as used.
   * Useful for pre-verification or information lookup.
   * @param ticketCode - The ticket code to verify
   * @returns Promise resolving to the verification result
   */
  peek(ticketCode: string): Promise<VerificationResult> {
    return this.verifyTicket({
      ticketCode,
      markAsUsed: false,
    });
  }

  /**
   * Logs a verification attempt with transactional support.
   * @param log - The verification log entry
   * @returns Promise resolving when logged
   */
  async logVerification(
    log: Omit<VerificationLog, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const logEntry = this.verificationLogRepository.create({
      ticketCode: log.ticketCode,
      ticketId: log.ticketId ? log.ticketId : null,
      eventId: log.eventId,
      status: log.status,
      verifierId: log.verifierId ? log.verifierId : null,
      verifiedAt: log.verifiedAt,
      deviceInfo: log.deviceInfo ? log.deviceInfo : null,
    });

    await this.verificationLogRepository.save(logEntry);
  }

  /**
   * Internal helper to log verification results
   */
  private async logVerificationResult(
    ticketCode: string,
    ticketId: string | null,
    eventId: string,
    status: VerificationStatus,
    verifierId?: string,
  ): Promise<void> {
    await this.logVerification({
      ticketCode,
      ticketId: ticketId ?? undefined,
      eventId,
      status,
      verifierId,
      verifiedAt: new Date(),
    });
  }

  /**
   * Retrieves verification logs for an event.
   * @param eventId - The event's unique identifier
   * @returns Promise resolving to array of verification logs
   */
  async getLogsForEvent(eventId: string): Promise<VerificationLog[]> {
    const logs = await this.verificationLogRepository.find({
      where: { eventId },
      order: { verifiedAt: 'DESC' },
    });

    return logs.map((log) => this.mapLogEntityToInterface(log));
  }

  /**
   * Retrieves verification logs for a specific ticket.
   * @param ticketCode - The ticket code
   * @returns Promise resolving to array of verification logs
   */
  async getLogsForTicket(ticketCode: string): Promise<VerificationLog[]> {
    const logs = await this.verificationLogRepository.find({
      where: { ticketCode },
      order: { verifiedAt: 'DESC' },
    });

    return logs.map((log) => this.mapLogEntityToInterface(log));
  }

  /**
   * Gets verification statistics for an event.
   * Derives counts from live ticket data.
   *
   * @param eventId - The event's unique identifier
   * @returns Promise resolving to verification statistics
   */
  async getStatsForEvent(eventId: string): Promise<VerificationStats> {
    const ticketRepository = this.dataSource.getRepository(Ticket);

    // Get all tickets for the event
    const tickets = await ticketRepository.find({
      where: { eventId },
    });

    const totalTickets = tickets.length;
    const verifiedCount = tickets.filter(
      (t) => t.status === TicketStatus.SCANNED,
    ).length;
    const remainingCount = totalTickets - verifiedCount;
    const verificationRate =
      totalTickets > 0 ? (verifiedCount / totalTickets) * 100 : 0;

    return {
      eventId,
      totalTickets,
      verifiedCount,
      remainingCount,
      verificationRate: Math.round(verificationRate * 100) / 100,
      calculatedAt: new Date(),
    };
  }

  /**
   * Validates that verification can be performed for an event.
   * Checks the event's time window.
   *
   * @param eventId - The event's unique identifier
   * @returns Promise resolving to object with validity and reason
   */
  async canVerifyForEvent(
    eventId: string,
  ): Promise<{ canVerify: boolean; reason?: string }> {
    try {
      const event = await this.eventsService.getEventById(eventId);
      const now = new Date();

      if (now < event.eventDate) {
        return {
          canVerify: false,
          reason: 'Event has not started yet',
        };
      }

      if (now > event.eventClosingDate) {
        return {
          canVerify: false,
          reason: 'Event has already ended',
        };
      }

      return {
        canVerify: true,
      };
    } catch (error) {
      return {
        canVerify: false,
        reason: 'Event not found',
      };
    }
  }

  /**
   * Generates a verification summary message.
   * @param status - The verification status
   * @returns Human-readable message for the status
   */
  getStatusMessage(status: VerificationStatus): string {
    const messages: Record<VerificationStatus, string> = {
      [VerificationStatus.VALID]: 'Ticket is valid. Entry permitted.',
      [VerificationStatus.INVALID]: 'Invalid ticket. Entry denied.',
      [VerificationStatus.ALREADY_USED]:
        'Ticket has already been used. Entry denied.',
      [VerificationStatus.CANCELLED]:
        'Ticket has been cancelled. Entry denied.',
      [VerificationStatus.EXPIRED]: 'Ticket has expired. Entry denied.',
      [VerificationStatus.EVENT_NOT_STARTED]:
        'Event has not started yet. Please wait.',
      [VerificationStatus.EVENT_ENDED]:
        'Event has ended. Entry no longer permitted.',
    };

    return messages[status] || 'Unknown verification status.';
  }

  /**
   * Map Ticket entity to VerifiedTicketInfo
   */
  private mapTicketToVerifiedInfo(ticket: Ticket) {
    return {
      ticketId: ticket.id,
      ticketCode: ticket.qrCode,
      eventId: ticket.eventId,
      eventTitle: ticket.event?.title || 'Unknown',
      ticketTypeName: ticket.ticketType?.name || 'Unknown',
      holderName: ticket.attendeeName || undefined,
      seatInfo: undefined,
    };
  }

  /**
   * Map VerificationLogEntity to VerificationLog interface
   */
  private mapLogEntityToInterface(
    log: VerificationLogEntity,
  ): VerificationLog {
    return {
      id: log.id,
      ticketCode: log.ticketCode,
      ticketId: log.ticketId ?? undefined,
      eventId: log.eventId,
      status: log.status,
      verifierId: log.verifierId ?? undefined,
      verifiedAt: log.verifiedAt,
      deviceInfo: log.deviceInfo ?? undefined,
    };
  }
}

