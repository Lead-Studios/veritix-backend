import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { ArchiveEventDto } from '../dtos/archive-event.dto';
import { DeleteEventDto } from '../dtos/delete-event.dto';
import { EventResource } from '../resources/event.resource';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async findAll() {
    const events = await this.eventRepo.find();
    return EventResource.toArray(events);
  }

  async findOne(id: string) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return EventResource.toResponse(event);
  }

  async archive(dto: ArchiveEventDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Event not found');
    event['archived'] = true;
    await this.eventRepo.save(event);
    return { archived: true };
  }

  async delete(dto: DeleteEventDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Event not found');
    await this.eventRepo.delete(dto.eventId);
    return { deleted: true };
  }
} 