import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EventWaitlist } from './entities/event-waitlist.entity';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(EventWaitlist)
    private readonly waitlistRepo: Repository<EventWaitlist>,
    private readonly emailService: EmailService,
  ) {}

  async addToWaitlist(eventId: string, userId: string, ticketTypeId?: string): Promise<EventWaitlist> {
    const existing = await this.waitlistRepo.findOne({ where: { eventId, userId } });
    if (existing) throw new ConflictException('Already on waitlist for this event');

    const entry = this.waitlistRepo.create({ eventId, userId, ticketTypeId });
    return this.waitlistRepo.save(entry);
  }

  async removeFromWaitlist(eventId: string, userId: string): Promise<void> {
    const entry = await this.waitlistRepo.findOne({ where: { eventId, userId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    await this.waitlistRepo.remove(entry);
  }

  async notifyNext(eventId: string, count = 1): Promise<void> {
    const entries = await this.waitlistRepo.find({
      where: { eventId, notifiedAt: IsNull() },
      relations: ['user', 'event'],
      order: { joinedAt: 'ASC' },
      take: count,
    });

    for (const entry of entries) {
      if (entry.user?.email && entry.event?.title) {
        await this.emailService.sendWaitlistNotification(entry.user.email, entry.event.title);
        entry.notifiedAt = new Date();
        await this.waitlistRepo.save(entry);
      }
    }
  }
}
