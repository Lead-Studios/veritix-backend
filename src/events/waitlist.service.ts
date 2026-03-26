import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Inject,
  } from '@nestjs/common';
  import { Repository } from 'typeorm';
  import { InjectRepository } from '@nestjs/typeorm';
  import { EventWaitlist } from './entities/event-waitlist.entity';
  import { Event } from './entities/event.entity';
  import { CACHE_MANAGER } from '@nestjs/cache-manager';
  import { Cache } from 'cache-manager';
  
  @Injectable()
  export class WaitlistService {
    constructor(
      @InjectRepository(EventWaitlist)
      private readonly waitlistRepo: Repository<EventWaitlist>,
  
      @InjectRepository(Event)
      private readonly eventRepo: Repository<Event>,
    ) {}
  
    async joinWaitlist(eventId: string, userId: string, ticketTypeId?: string) {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (!event) throw new NotFoundException('Event not found');
  
      // prevent duplicate join
      const existing = await this.waitlistRepo.findOne({
        where: { eventId, userId, ticketTypeId: ticketTypeId || null },
      });
  
      if (existing) {
        throw new BadRequestException('Already on waitlist');
      }
  
      const entry = this.waitlistRepo.create({
        eventId,
        userId,
        ticketTypeId: ticketTypeId || null,
      });
  
      return this.waitlistRepo.save(entry);
    }
  
    async leaveWaitlist(eventId: string, userId: string) {
      await this.waitlistRepo.delete({ eventId, userId });
      return { message: 'Removed from waitlist' };
    }
  
    async getWaitlist(eventId: string, page = 1, limit = 10) {
      const [data, total] = await this.waitlistRepo.findAndCount({
        where: { eventId },
        order: { joinedAt: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
  
      return {
        data,
        total,
        page,
        limit,
      };
    }
  
    // 🔔 Notify top users
    async notifyWaitlist(eventId: string, ticketTypeId?: string) {
      const limit = parseInt(process.env.WAITLIST_NOTIFY_COUNT || '5', 10);
  
      const query = this.waitlistRepo
        .createQueryBuilder('w')
        .where('w.eventId = :eventId', { eventId })
        .andWhere('w.notifiedAt IS NULL')
        .orderBy('w.joinedAt', 'ASC')
        .limit(limit);
  
      if (ticketTypeId) {
        query.andWhere(
          '(w.ticketTypeId = :ticketTypeId OR w.ticketTypeId IS NULL)',
          { ticketTypeId },
        );
      }
  
      const users = await query.getMany();
  
      return users;
    }
  
    async markNotified(ids: string[]) {
      await this.waitlistRepo
        .createQueryBuilder()
        .update()
        .set({ notifiedAt: new Date() })
        .whereInIds(ids)
        .execute();
    }
  }