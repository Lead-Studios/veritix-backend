import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getPublicProfile(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const response: any = {
      id: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      country: user.country,
      organizationName: user.organizationName,
    };

    if (user.role === UserRole.ORGANIZER) {
      const events = await this.eventRepository.find({
        where: { organizerId: id, status: EventStatus.PUBLISHED },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      response.events = events.map((event) => ({
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        city: event.city,
      }));
    }

    return response;
  }
}
