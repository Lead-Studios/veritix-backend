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
import { UpdateEventAntiScalpingDto } from '../../ticket/dto/update-event-anti-scalping.dto';
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

  async updateAntiScalpingSettings(
    id: string,
    antiScalpingDto: UpdateEventAntiScalpingDto,
    organizer: User,
  ): Promise<Event> {
    const event = await this.findOne(id, organizer);
    
    // Validate max resale price if provided
    if (antiScalpingDto.maxResalePrice !== undefined) {
      if (antiScalpingDto.maxResalePrice < 0) {
        throw new ForbiddenException('Max resale price must be non-negative');
      }
      if (antiScalpingDto.maxResalePrice < event.ticketPrice) {
        throw new ForbiddenException('Max resale price cannot be less than original ticket price');
      }
    }

    // Validate transfer cooldown if provided
    if (antiScalpingDto.transferCooldownHours !== undefined) {
      if (antiScalpingDto.transferCooldownHours < 0) {
        throw new ForbiddenException('Transfer cooldown must be non-negative');
      }
    }

    // Validate max transfers per ticket if provided
    if (antiScalpingDto.maxTransfersPerTicket !== undefined) {
      if (antiScalpingDto.maxTransfersPerTicket < 0) {
        throw new ForbiddenException('Max transfers per ticket must be non-negative');
      }
    }

    Object.assign(event, antiScalpingDto);
    return this.eventRepository.save(event);
  }
}
