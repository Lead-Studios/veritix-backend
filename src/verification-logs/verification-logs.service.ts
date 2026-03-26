import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import {
  VerificationLog,
  VerificationStatus,
} from './entities/verification-log.entity';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,

    @InjectRepository(VerificationLog)
    private readonly logRepo: Repository<VerificationLog>,

    private readonly dataSource: DataSource,
  ) {}

  // -------------------------------
  // VERIFY TICKET
  // -------------------------------
  async verifyTicket(request: {
    ticketCode: string;
    markAsUsed?: boolean;
    verifiedBy?: string;
  }) {
    const { ticketCode, markAsUsed = true, verifiedBy } = request;

    const ticket = await this.ticketRepo.findOne({
      where: { qrCode: ticketCode },
      relations: ['ticketType'],
    });

    if (!ticket) {
      return this.logAndReturn(null, null, {
        status: VerificationStatus.INVALID,
        isValid: false,
        message: 'Ticket not found',
        verifiedBy,
      });
    }

    const event = await this.eventRepo.findOne({
      where: { id: ticket.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();

    // ❌ STATUS CHECKS
    if (ticket.status === 'SCANNED') {
      return this.logAndReturn(ticket, event, {
        status: VerificationStatus.ALREADY_USED,
        isValid: false,
        message: 'Ticket already scanned',
        verifiedBy,
      });
    }

    if (ticket.status === 'CANCELLED') {
      return this.logAndReturn(ticket, event, {
        status: VerificationStatus.CANCELLED,
        isValid: false,
        message: 'Ticket is cancelled',
        verifiedBy,
      });
    }

    if (now < new Date(event.eventDate)) {
      return this.logAndReturn(ticket, event, {
        status: VerificationStatus.EVENT_NOT_STARTED,
        isValid: false,
        message: 'Event has not started',
        verifiedBy,
      });
    }

    if (now > new Date(event.eventClosingDate)) {
      return this.logAndReturn(ticket, event, {
        status: VerificationStatus.EVENT_ENDED,
        isValid: false,
        message: 'Event has ended',
        verifiedBy,
      });
    }

    // ✅ VALID CASE (WITH TRANSACTION)
    if (markAsUsed) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const lockedTicket = await queryRunner.manager.findOne(Ticket, {
          where: { id: ticket.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (lockedTicket.status === 'SCANNED') {
          await queryRunner.rollbackTransaction();

          return this.logAndReturn(ticket, event, {
            status: VerificationStatus.ALREADY_USED,
            isValid: false,
            message: 'Ticket already scanned',
            verifiedBy,
          });
        }

        lockedTicket.status = 'SCANNED';
        lockedTicket.scannedAt = new Date();

        await queryRunner.manager.save(lockedTicket);

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    return this.logAndReturn(ticket, event, {
      status: VerificationStatus.VALID,
      isValid: true,
      message: 'Ticket is valid',
      verifiedBy,
    });
  }

  // -------------------------------
  // LOG HELPER
  // -------------------------------
  private async logAndReturn(ticket: Ticket | null, event: Event | null, data: any) {
    if (ticket && event) {
      const log = this.logRepo.create({
        ticketId: ticket.id,
        eventId: event.id,
        ...data,
      });

      await this.logRepo.save(log);
    }

    return {
      ...data,
      ticket: ticket
        ? {
            id: ticket.id,
            attendeeName: ticket.attendeeName,
            attendeeEmail: ticket.attendeeEmail,
            ticketTypeId: ticket.ticketTypeId,
          }
        : null,
    };
  }

  // -------------------------------
  // GET LOGS FOR EVENT
  // -------------------------------
  async getLogsForEvent(eventId: string) {
    return this.logRepo.find({
      where: { eventId },
      order: { verifiedAt: 'DESC' },
    });
  }

  // -------------------------------
  // GET LOGS FOR TICKET
  // -------------------------------
  async getLogsForTicket(ticketId: string) {
    return this.logRepo.find({
      where: { ticketId },
      order: { verifiedAt: 'DESC' },
    });
  }

  // -------------------------------
  // STATS FOR EVENT
  // -------------------------------
  async getStatsForEvent(eventId: string) {
    const stats = await this.logRepo
      .createQueryBuilder('v')
      .select('v.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('v.eventId = :eventId', { eventId })
      .groupBy('v.status')
      .getRawMany();

    const map = {};
    stats.forEach((s) => {
      map[s.status] = Number(s.count);
    });

    return map;
  }
}