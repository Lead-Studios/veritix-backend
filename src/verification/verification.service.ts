import { Injectable, NotFoundException } from '@nestjs/common';
import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { VerificationStatus } from './enums/verification-status.enum';
import { EventStatus } from '../events/enums/event-status.enum';
import { VerificationQueryDto } from './dto/verification-query.dto';
import { VerificationGateway } from './verification.gateway';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(VerificationLog)
    private verificationLogRepository: Repository<VerificationLog>,
    @Optional() private readonly gateway?: VerificationGateway,
  ) {}

  async verifyTicket(
    ticketId: string,
    markAsUsed: boolean,
    verifiedBy?: string,
  ): Promise<VerificationStatus> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event'],
    });

    if (!ticket) {
      await this.logVerification(ticketId, VerificationStatus.INVALID, markAsUsed, verifiedBy);
      return VerificationStatus.INVALID;
    }

    const event = ticket.event;

    if (event.status === EventStatus.CANCELLED) {
      await this.logVerification(ticketId, VerificationStatus.CANCELLED, markAsUsed, verifiedBy);
      return VerificationStatus.CANCELLED;
    }

    const now = new Date();

    if (now < event.eventDate) {
      await this.logVerification(ticketId, VerificationStatus.EVENT_NOT_STARTED, markAsUsed, verifiedBy);
      return VerificationStatus.EVENT_NOT_STARTED;
    }

    if (event.eventClosingDate && now > event.eventClosingDate) {
      await this.logVerification(ticketId, VerificationStatus.EVENT_ENDED, markAsUsed, verifiedBy);
      return VerificationStatus.EVENT_ENDED;
    }

    if (ticket.status === 'USED') {
      await this.logVerification(ticketId, VerificationStatus.ALREADY_USED, markAsUsed, verifiedBy);
      return VerificationStatus.ALREADY_USED;
    }

    if (markAsUsed) {
      await this.ticketRepository.update(ticketId, { status: 'USED' });
      // Emit real-time scan update via WebSocket
      if (this.gateway) {
        await this.gateway.emitScanUpdate(ticket.eventId);
      }
    }

    await this.logVerification(ticketId, VerificationStatus.VALID, markAsUsed, verifiedBy);
    return VerificationStatus.VALID;
  }

  private async logVerification(
    ticketId: string,
    status: VerificationStatus,
    markAsUsed: boolean,
    verifiedBy?: string,
  ): Promise<void> {
    const log = this.verificationLogRepository.create({
      ticketId,
      status,
      markAsUsed,
      verifiedBy,
    });
    await this.verificationLogRepository.save(log);
  }

  public async getVerificationLogsForTicket(ticketId: string): Promise<VerificationLog[]> {
    return this.verificationLogRepository.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLogs(eventId: string, query: VerificationQueryDto) {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const [logs, total] = await this.verificationLogRepository.findAndCount({
      where: { eventId },
      order: { verifiedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: logs, page, limit, total };
  }
}
