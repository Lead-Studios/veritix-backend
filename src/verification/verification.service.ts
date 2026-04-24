import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationLog } from './entities/verification-log.entity';
import { VerificationQueryDto } from './dto/verification-query.dto';
import { Event } from '../events/entities/event.entity';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationLog)
    private readonly verificationLogRepository: Repository<VerificationLog>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getLogs(eventId: string, query: VerificationQueryDto) {
    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const [logs, total] = await this.verificationLogRepository.findAndCount({
      where: { eventId },
      order: { verifiedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: logs,
      page,
      limit,
      total,
    };
  }
}
