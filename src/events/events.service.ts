import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventStatus } from './enums/event-status.enum';
import { isValidTransition } from './event-transitions';
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
      title: dto.title,
      description: dto.description,
      venue: dto.venue,
      city: dto.city,
      countryCode: dto.countryCode,
      isVirtual: dto.isVirtual ?? false,
      imageUrl: dto.imageUrl,
      eventDate: new Date(dto.eventDate),
      eventClosingDate: dto.eventClosingDate ? new Date(dto.eventClosingDate) : null,
      capacity: dto.capacity ?? 0,
      tags: dto.tags ?? [],
      organizerId: user.id,
      status: dto.status || EventStatus.DRAFT,
    });
    return await this.eventsRepository.save(event);
  }

  async findAll(query: EventQueryDto): Promise<{ data: Event[]; total: number; page: number; limit: number; totalPages: number }> {
    const { search, status, city, countryCode, isVirtual, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = query;

    const qb = this.eventsRepository.createQueryBuilder('event')
      .where('event.isArchived = false')
      .andWhere('event.status = :status', { status: status ?? EventStatus.PUBLISHED });

    if (search) {
      qb.andWhere('(event.title ILIKE :search OR event.description ILIKE :search)', { search: `%${search}%` });
    }
    if (city) qb.andWhere('event.city ILIKE :city', { city: `%${city}%` });
    if (countryCode) qb.andWhere('event.countryCode = :countryCode', { countryCode });
    if (isVirtual !== undefined) qb.andWhere('event.isVirtual = :isVirtual', { isVirtual });
    if (dateFrom) qb.andWhere('event.eventDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('event.eventDate <= :dateTo', { dateTo });

    qb.orderBy(`event.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['ticketTypes', 'organizer'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, dto: UpdateEventDto, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to update this event');
    }
    
    // Explicitly handle date fields to convert to Date objects
    const updateData = { ...dto };
    if (dto.eventDate) {
      updateData.eventDate = new Date(dto.eventDate) as any;
    }
    if (dto.eventClosingDate) {
      updateData.eventClosingDate = new Date(dto.eventClosingDate) as any;
    }
    
    Object.assign(event, updateData);
    return await this.eventsRepository.save(event);
  }

  async changeStatus(id: string, newStatus: EventStatus, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to change this event status');
    }
    if (!isValidTransition(event.status, newStatus)) {
      throw new BadRequestException(`Cannot transition from ${event.status} to ${newStatus}`);
    }
    event.status = newStatus;
    return await this.eventsRepository.save(event);
  }

  async remove(id: string, user: User): Promise<void> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
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
    if (!event) throw new NotFoundException('Event not found');
    const capacity = event.capacity;
    const totalSold = 0;
    const remaining = capacity - totalSold;
    return { capacity, totalSold, remaining, isSoldOut: remaining <= 0 };
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
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
