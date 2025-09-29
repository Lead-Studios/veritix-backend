import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../../user/user.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    organizer: User,
  ): Promise<Event> {
    if (
      new Date(createEventDto.startDate) >= new Date(createEventDto.endDate)
    ) {
      throw new ForbiddenException('Start date must be before end date');
    }
    if (createEventDto.capacity < 0) {
      throw new ForbiddenException('Capacity must be non-negative');
    }
    const event = this.eventRepository.create({ ...createEventDto, organizer });
    return this.eventRepository.save(event);
  }

  async findAll(organizer: User): Promise<Event[]> {
    return this.eventRepository.find({ where: { organizer } });
  }

  async findOne(id: string, organizer: User): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id, organizer },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    organizer: User,
  ): Promise<Event> {
    const event = await this.findOne(id, organizer);
    if (updateEventDto.startDate && updateEventDto.endDate) {
      if (
        new Date(updateEventDto.startDate) >= new Date(updateEventDto.endDate)
      ) {
        throw new ForbiddenException('Start date must be before end date');
      }
    }
    if (updateEventDto.capacity !== undefined && updateEventDto.capacity < 0) {
      throw new ForbiddenException('Capacity must be non-negative');
    }
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }
}
