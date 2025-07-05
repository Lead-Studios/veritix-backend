import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationService } from 'src/notification/services/notification.service';
import { User } from 'src/user/entities/user.entity';
import { Event } from 'src/event/entities/event.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
    @InjectQueue('waitlist-notifications')
    private waitlistQueue: Queue,
  ) {}

  async joinWaitlist(userId: string, eventId: string): Promise<WaitlistEntry> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is already on waitlist
    const existingEntry = await this.waitlistRepository.findOne({
      where: { userId, eventId },
    });
    if (existingEntry) {
      throw new ConflictException(
        'User is already on the waitlist for this event',
      );
    }

    // Check if event has available tickets
    if (event.availableTickets > 0) {
      throw new BadRequestException(
        'Event has available tickets, no need to join waitlist',
      );
    }

    // Create waitlist entry
    const waitlistEntry = this.waitlistRepository.create({
      userId,
      eventId,
    });

    return await this.waitlistRepository.save(waitlistEntry);
  }

  async removeFromWaitlist(userId: string, eventId: string): Promise<void> {
    const waitlistEntry = await this.waitlistRepository.findOne({
      where: { userId, eventId },
    });

    if (!waitlistEntry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    await this.waitlistRepository.remove(waitlistEntry);
  }

  async getWaitlistPosition(userId: string, eventId: string): Promise<number> {
    const waitlistEntry = await this.waitlistRepository.findOne({
      where: { userId, eventId },
    });

    if (!waitlistEntry) {
      throw new NotFoundException('User not found on waitlist');
    }

    const position = await this.waitlistRepository.count({
      where: {
        eventId,
        createdAt: {
          $lt: waitlistEntry.createdAt,
        },
      },
    });

    return position + 1; // 1-based position
  }

  async notifyWaitlistUsers(
    eventId: string,
    availableTickets: number,
  ): Promise<void> {
    const waitlistUsers = await this.waitlistRepository.find({
      where: { eventId, notified: false },
      relations: ['user', 'event'],
      order: { createdAt: 'ASC' },
      take: availableTickets,
    });

    if (waitlistUsers.length === 0) {
      return;
    }

    // Add job to queue for processing notifications
    await this.waitlistQueue.add('notify-waitlist-users', {
      eventId,
      userIds: waitlistUsers.map((entry) => entry.userId),
      availableTickets,
    });
  }

  async getWaitlistByEvent(
    eventId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const [entries, total] = await this.waitlistRepository.findAndCount({
      where: { eventId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
