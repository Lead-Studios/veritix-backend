import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventStatus } from '../enums/event-status.enum';
import { applyEventStatusChange } from './lifecycle/event.lifecycle';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from 'src/auth/common/enum/user-role-enum';
import { EventQueryDto } from './dto/event-query.dto';
import { PaginatedEventsResponseDto } from './dto/paginated-events-response.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) { }

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
  async updateEvent(id: string, dto: UpdateEventDto, user: User) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const isAdmin = user.role === UserRole.ADMIN;

    const isOwner = event.organizerId === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You do not have permission to update this event');
    }

    Object.assign(event, dto);
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
  async findAll(queryDto: EventQueryDto, includeAll: boolean = false): Promise<PaginatedEventsResponseDto> {
    const query = this.eventRepository.createQueryBuilder('event');

    // 1. apply public default filters
    if (!includeAll) {
      query.andWhere('event.isArchived = :isArchived', { isArchived: false });
      query.andWhere('event.status != :status', { status: EventStatus.CANCELLED });
    }

    // 2. Full-text search
    if (queryDto.search) {
      query.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    // 3. Status filter
    if (queryDto.status) {
      query.andWhere('event.status = :statusFilter', { statusFilter: queryDto.status });
    }

    // 4. Location filters
    if (queryDto.city) {
      query.andWhere('event.city ILIKE :city', { city: `%${queryDto.city}%` });
    }
    if (queryDto.countryCode) {
      query.andWhere('event.countryCode = :countryCode', { countryCode: queryDto.countryCode });
    }
    if (queryDto.isVirtual !== undefined) {
      query.andWhere('event.isVirtual = :isVirtual', { isVirtual: queryDto.isVirtual });
    }

    // 5. Date range
    if (queryDto.dateFrom) {
      query.andWhere('event.eventDate >= :dateFrom', { dateFrom: queryDto.dateFrom });
    }
    if (queryDto.dateTo) {
      query.andWhere('event.eventDate <= :dateTo', { dateTo: queryDto.dateTo });
    }

    // 6. Price range
    if (queryDto.minTicketPrice !== undefined || queryDto.maxTicketPrice !== undefined) {
      query.innerJoin('event.ticketTypes', 'ticketType');

      if (queryDto.minTicketPrice !== undefined) {
        query.andWhere('ticketType.price >= :minTicketPrice', { minTicketPrice: queryDto.minTicketPrice });
      }
      if (queryDto.maxTicketPrice !== undefined) {
        query.andWhere('ticketType.price <= :maxTicketPrice', { maxTicketPrice: queryDto.maxTicketPrice });
      }
    }

    // 7. Tags filter
    if (queryDto.tags && queryDto.tags.length > 0) {
      // Postgres ARRAY contains @>
      query.andWhere('event.tags @> ARRAY[:...tags]::text[]', { tags: queryDto.tags });
    }

    // 8. Sorting
    const sortBy = queryDto.sortBy || 'eventDate';
    const sortOrder = queryDto.sortOrder || 'ASC';
    query.orderBy(`event.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // 9. Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

}
