import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventStatus } from '../enums/event-status.enum';
import { applyEventStatusChange } from './lifecycle/event.lifecycle';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../auth/entities/user.entity';

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
      eventDate: new Date(dto.eventDate),
      eventClosingDate: new Date(dto.eventClosingDate),
      capacity: dto.capacity,
      status: EventStatus.DRAFT,
    });

    const saved = await this.eventRepository.save(event);

    return saved;
  }

  // -------------------------------
  // UPDATE EVENT
  // -------------------------------
  async updateEvent(id: string, dto: UpdateEventDto, user: User): Promise<Event> {
    const event = await this.getEventById(id);

    Object.assign(event, {
      title: dto.title ?? event.title,
      description: dto.description ?? event.description,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : event.eventDate,
      eventClosingDate: dto.eventClosingDate ? new Date(dto.eventClosingDate) : event.eventClosingDate,
      capacity: dto.capacity ?? event.capacity,
    });

    return this.eventRepository.save(event);
  }

  // -------------------------------
  // CHANGE STATUS
  // -------------------------------
  async changeStatus(id: string, newStatus: EventStatus, user: User): Promise<Event> {
    const event = await this.getEventById(id);

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

  const result = await this.eventRepository.delete(id);
  return (result.affected ?? 0) > 0;
}
async findAll(): Promise<Event[]> {
  return this.eventRepository.find();
}


}
