import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventStatus } from '../enums/event-status.enum';
import { applyEventStatusChange } from './lifecycle/event.lifecycle';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../user/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  // -------------------------------
  // CREATE EVENT
  // -------------------------------
  async createEvent(dto: CreateEventDto, user: User): Promise<Event> {
    const event = this.eventRepository.create({
      title: dto.title,
      description: dto.description,
      eventDate: new Date(dto.startDate),
      eventClosingDate: new Date(dto.endDate),
      capacity: dto.capacity,
      status: EventStatus.DRAFT,
    });

    const saved = await this.eventRepository.save(event);

    // Assign ownership
    user.ownedEventIds.push(saved.id);

    return saved;
  }

  // -------------------------------
  // UPDATE EVENT
  // -------------------------------
  async updateEvent(id: string, dto: UpdateEventDto, user: User): Promise<Event> {
    const event = await this.getEventById(id);

    if (!user.ownedEventIds.includes(event.id)) {
      throw new ForbiddenException('Only owner can update this event');
    }

    Object.assign(event, {
      title: dto.title ?? event.title,
      description: dto.description ?? event.description,
      eventDate: dto.startDate ? new Date(dto.startDate) : event.eventDate,
      eventClosingDate: dto.endDate ? new Date(dto.endDate) : event.eventClosingDate,
      capacity: dto.capacity ?? event.capacity,
    });

    return this.eventRepository.save(event);
  }

  // -------------------------------
  // CHANGE STATUS
  // -------------------------------
  async changeStatus(id: string, newStatus: EventStatus, user: User): Promise<Event> {
    const event = await this.getEventById(id);

    if (!user.ownedEventIds.includes(event.id)) {
      throw new ForbiddenException('Only owner can change status');
    }

    applyEventStatusChange(event, newStatus);

    return this.eventRepository.save(event);
  }

  // -------------------------------
  // GET EVENT BY ID
  // -------------------------------
  async getEventById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  // -------------------------------
  // DELETE EVENT
  // -------------------------------
 async deleteEvent(id: string, user: User): Promise<boolean> {
  const event = await this.getEventById(id);

  if (!user.ownedEventIds.includes(event.id)) {
    throw new ForbiddenException('Only owner can delete this event');
  }

  const result = await this.eventRepository.delete(id);
  return (result.affected ?? 0) > 0;
}
async findAll(): Promise<Event[]> {
  return this.eventRepository.find();
}


}
