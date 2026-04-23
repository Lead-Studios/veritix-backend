import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventStatus } from './enums/event-status.enum';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async createEvent(dto: CreateEventDto, user: User): Promise<Event> {
    const event = this.eventsRepository.create({
      ...dto,
      eventDate: new Date(dto.eventDate),
      organizerId: user.id,
      status: dto.status || EventStatus.DRAFT,
    });

    return await this.eventsRepository.save(event);
  }

  async remove(id: string, user: User): Promise<void> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.CANCELLED) {
      throw new BadRequestException('Only events in DRAFT or CANCELLED status can be deleted');
    }

    event.isArchived = true;
    await this.eventsRepository.save(event);
  }

  async getCapacity(id: string): Promise<{ capacity: number; totalSold: number; remaining: number; isSoldOut: boolean }> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // For now, we'll return the event capacity data
    // In a real scenario, you would aggregate from TicketType entities
    const capacity = event.capacity;
    const totalSold = 0; // This would be calculated from ticket sales
    const remaining = capacity - totalSold;
    const isSoldOut = remaining <= 0;

    return {
      capacity,
      totalSold,
      remaining,
      isSoldOut,
    };
  }

  async findByOrganizer(organizerId: string, pagination: PaginationDto): Promise<{ data: Event[]; total: number }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    
    const [data, total] = await this.eventsRepository.findAndCount({
      where: { organizerId, isArchived: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
