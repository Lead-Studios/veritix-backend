import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
import { EventDetailResponseDto } from './dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
  
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
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
  async updateEvent(id: string, dto: UpdateEventDto, user: User) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const isAdmin = user.role === UserRole.ADMIN;

    const isOwner = event.organizerId === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to update this event',
      );
    }

    Object.assign(event, dto);
    return this.eventRepository.save(event);
  }
  // -------------------------------
  // CHANGE STATUS
  // -------------------------------
  async changeStatus(
    id: string,
    newStatus: EventStatus,
    user: User,
  ): Promise<Event> {
    const event = await this.getEventById(id);

    applyEventStatusChange(event, newStatus);

    return this.eventRepository.save(event);
  }

  // -------------------------------
  // GET EVENT BY ID
  // -------------------------------
  async getEventById(id: string): Promise<EventDetailResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['ticketTypes'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.mapToEventDetailResponse(event);
  }

  // -------------------------------
  // DELETE EVENT
  // -------------------------------
  async deleteEvent(id: string, user: User): Promise<boolean> {
    const event = await this.getEventById(id);

    const result = await this.eventRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
  async findAll(
    queryDto: EventQueryDto,
    includeAll: boolean = false,
  ): Promise<PaginatedEventsResponseDto> {
    const query = this.eventRepository.createQueryBuilder('event');

    // 1. apply public default filters
    if (!includeAll) {
      query.andWhere('event.isArchived = :isArchived', { isArchived: false });
      query.andWhere('event.status != :status', {
        status: EventStatus.CANCELLED,
      });
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
      query.andWhere('event.status = :statusFilter', {
        statusFilter: queryDto.status,
      });
    }

    // 4. Location filters
    if (queryDto.city) {
      query.andWhere('event.city ILIKE :city', { city: `%${queryDto.city}%` });
    }
    if (queryDto.countryCode) {
      query.andWhere('event.countryCode = :countryCode', {
        countryCode: queryDto.countryCode,
      });
    }
    if (queryDto.isVirtual !== undefined) {
      query.andWhere('event.isVirtual = :isVirtual', {
        isVirtual: queryDto.isVirtual,
      });
    }

    // 5. Date range
    if (queryDto.dateFrom) {
      query.andWhere('event.eventDate >= :dateFrom', {
        dateFrom: queryDto.dateFrom,
      });
    }
    if (queryDto.dateTo) {
      query.andWhere('event.eventDate <= :dateTo', { dateTo: queryDto.dateTo });
    }

    // 6. Price range
    if (
      queryDto.minTicketPrice !== undefined ||
      queryDto.maxTicketPrice !== undefined
    ) {
      query.innerJoin('event.ticketTypes', 'ticketType');

      if (queryDto.minTicketPrice !== undefined) {
        query.andWhere('ticketType.price >= :minTicketPrice', {
          minTicketPrice: queryDto.minTicketPrice,
        });
      }
      if (queryDto.maxTicketPrice !== undefined) {
        query.andWhere('ticketType.price <= :maxTicketPrice', {
          maxTicketPrice: queryDto.maxTicketPrice,
        });
      }
    }

    // 7. Tags filter
    if (queryDto.tags && queryDto.tags.length > 0) {
      // Postgres ARRAY contains @>
      query.andWhere('event.tags @> ARRAY[:...tags]::text[]', {
        tags: queryDto.tags,
      });
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
  async updateImage(eventId: number, imageUrl: string) {
    const event = await this.eventRepository.findOneBy({ id: eventId });
  
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  
    event.imageUrl = imageUrl;
  
    return this.eventRepository.save(event);

  async getEventCapacity(id: string) {
  const event = await this.eventRepository.findOne({
    where: { id },
  });

  if (!event) throw new NotFoundException('Event not found');

  const { totalSold } = await this.eventRepository.manager
    .createQueryBuilder('ticket_type', 'tt')
    .select('COALESCE(SUM(tt.soldQuantity), 0)', 'totalSold')
    .where('tt.eventId = :eventId', { eventId: id })
    .getRawOne();

  const sold = Number(totalSold);
  const remaining = event.capacity - sold;

  return {
    capacity: event.capacity,
    totalSold: sold,
    remaining,
    isSoldOut: remaining <= 0,
  };
}

async getEventAnalytics(eventId: string, user: User) {
  const cacheKey = `event:analytics:${eventId}`;

  // ✅ cache first
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  const event = await this.eventRepository.findOne({
    where: { id: eventId },
  });

  if (!event) throw new NotFoundException('Event not found');

  // 🔐 Access control
  const isAdmin = user.role === UserRole.ADMIN;
  const isOwner = event.organizerId === user.id;

  if (!isAdmin && !isOwner) {
    throw new ForbiddenException('Access denied');
  }

  // -------------------------------
  // 1. Sales by Ticket Type
  // -------------------------------
  const ticketTypes = await this.ticketTypeRepository.find({
    where: { eventId },
  });

  const salesByTicketType = ticketTypes.map((tt) => ({
    name: tt.name,
    sold: tt.soldQuantity,
    remaining: tt.totalQuantity - tt.soldQuantity,
  }));

  // -------------------------------
  // 2. Total Revenue
  // -------------------------------
  const { revenue } = await this.ticketTypeRepository
    .createQueryBuilder('tt')
    .select('COALESCE(SUM(tt.price * tt.soldQuantity), 0)', 'revenue')
    .where('tt.eventId = :eventId', { eventId })
    .getRawOne();

  // -------------------------------
  // 3. Scan Stats
  // -------------------------------
  const scanStatsRaw = await this.ticketRepository
    .createQueryBuilder('t')
    .select('COUNT(*) FILTER (WHERE t.status = :scanned)', 'scanned')
    .addSelect('COUNT(*) FILTER (WHERE t.status != :cancelled)', 'total')
    .setParameters({
      scanned: 'SCANNED',
      cancelled: 'CANCELLED',
    })
    .where('t.eventId = :eventId', { eventId })
    .getRawOne();

  const totalScanned = Number(scanStatsRaw.scanned || 0);
  const totalTickets = Number(scanStatsRaw.total || 0);

  const scanRate =
    totalTickets === 0 ? 0 : Number(((totalScanned / totalTickets) * 100).toFixed(1));

  // -------------------------------
  // 4. Sales Velocity (last 30 days)
  // -------------------------------
  const salesVelocity = await this.ticketRepository
    .createQueryBuilder('t')
    .select(`DATE(t.createdAt)`, 'date')
    .addSelect('COUNT(*)', 'ticketsSold')
    .where('t.eventId = :eventId', { eventId })
    .andWhere('t.createdAt >= NOW() - INTERVAL \'30 days\'')
    .groupBy('date')
    .orderBy('date', 'ASC')
    .getRawMany();

  const formattedVelocity = salesVelocity.map((row) => ({
    date: row.date,
    ticketsSold: Number(row.ticketsSold),
  }));

  const result = {
    eventId,
    title: event.title,
    salesByTicketType,
    totalRevenue: Number(revenue),
    scanStats: {
      totalScanned,
      scanRate,
    },
    salesVelocity: formattedVelocity,
    generatedAt: new Date().toISOString(),
  };

  // ✅ cache for 5 mins
  await this.cacheManager.set(cacheKey, result, 300);

  return result;
}

async deleteEventSById(id: string, user: User): Promise<boolean> {
  const event = await this.getEventById(id);

  const result = await this.eventRepository.delete(id);
  return (result.affected ?? 0) > 0;
}
async findAllEvents(
  queryDto: EventQueryDto,
  includeAll: boolean = false,
): Promise<PaginatedEventsResponseDto> {
  const query = this.eventRepository.createQueryBuilder('event');

  // 1. apply public default filters
  if (!includeAll) {
    query.andWhere('event.isArchived = :isArchived', { isArchived: false });
    query.andWhere('event.status != :status', {
      status: EventStatus.CANCELLED,
    });
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
    query.andWhere('event.status = :statusFilter', {
      statusFilter: queryDto.status,
    });
  }

  // 4. Location filters
  if (queryDto.city) {
    query.andWhere('event.city ILIKE :city', { city: `%${queryDto.city}%` });
  }
  if (queryDto.countryCode) {
    query.andWhere('event.countryCode = :countryCode', {
      countryCode: queryDto.countryCode,
    });
  }
  if (queryDto.isVirtual !== undefined) {
    query.andWhere('event.isVirtual = :isVirtual', {
      isVirtual: queryDto.isVirtual,
    });
  }

  // 5. Date range
  if (queryDto.dateFrom) {
    query.andWhere('event.eventDate >= :dateFrom', {
      dateFrom: queryDto.dateFrom,
    });
  }
  if (queryDto.dateTo) {
    query.andWhere('event.eventDate <= :dateTo', { dateTo: queryDto.dateTo });
  }

  // 6. Price range
  if (
    queryDto.minTicketPrice !== undefined ||
    queryDto.maxTicketPrice !== undefined
  ) {
    query.innerJoin('event.ticketTypes', 'ticketType');

    if (queryDto.minTicketPrice !== undefined) {
      query.andWhere('ticketType.price >= :minTicketPrice', {
        minTicketPrice: queryDto.minTicketPrice,
      });
    }
    if (queryDto.maxTicketPrice !== undefined) {
      query.andWhere('ticketType.price <= :maxTicketPrice', {
        maxTicketPrice: queryDto.maxTicketPrice,
      });
    }
  }

  // 7. Tags filter
  if (queryDto.tags && queryDto.tags.length > 0) {
    // Postgres ARRAY contains @>
    query.andWhere('event.tags @> ARRAY[:...tags]::text[]', {
      tags: queryDto.tags,
    });
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

async getEventCapacityForEvents(id: string) {
const event = await this.eventRepository.findOne({
  where: { id },
});

if (!event) throw new NotFoundException('Event not found');

const { totalSold } = await this.eventRepository.manager
  .createQueryBuilder('ticket_type', 'tt')
  .select('COALESCE(SUM(tt.soldQuantity), 0)', 'totalSold')
  .where('tt.eventId = :eventId', { eventId: id })
  .getRawOne();

const sold = Number(totalSold);
const remaining = event.capacity - sold;

return {
  capacity: event.capacity,
  totalSold: sold,
  remaining,
  isSoldOut: remaining <= 0,
};
}

async getEventAnalyticsForAllEvents(eventId: string, user: User) {
const cacheKey = `event:analytics:${eventId}`;

// ✅ cache first
const cached = await this.cacheManager.get(cacheKey);
if (cached) return cached;

const event = await this.eventRepository.findOne({
  where: { id: eventId },
});

if (!event) throw new NotFoundException('Event not found');

// 🔐 Access control
const isAdmin = user.role === UserRole.ADMIN;
const isOwner = event.organizerId === user.id;

if (!isAdmin && !isOwner) {
  throw new ForbiddenException('Access denied');
}

// -------------------------------
// 1. Sales by Ticket Type
// -------------------------------
const ticketTypes = await this.ticketTypeRepository.find({
  where: { eventId },
});

const salesByTicketType = ticketTypes.map((tt) => ({
  name: tt.name,
  sold: tt.soldQuantity,
  remaining: tt.totalQuantity - tt.soldQuantity,
}));

// -------------------------------
// 2. Total Revenue
// -------------------------------
const { revenue } = await this.ticketTypeRepository
  .createQueryBuilder('tt')
  .select('COALESCE(SUM(tt.price * tt.soldQuantity), 0)', 'revenue')
  .where('tt.eventId = :eventId', { eventId })
  .getRawOne();

// -------------------------------
// 3. Scan Stats
// -------------------------------
const scanStatsRaw = await this.ticketRepository
  .createQueryBuilder('t')
  .select('COUNT(*) FILTER (WHERE t.status = :scanned)', 'scanned')
  .addSelect('COUNT(*) FILTER (WHERE t.status != :cancelled)', 'total')
  .setParameters({
    scanned: 'SCANNED',
    cancelled: 'CANCELLED',
  })
  .where('t.eventId = :eventId', { eventId })
  .getRawOne();

const totalScanned = Number(scanStatsRaw.scanned || 0);
const totalTickets = Number(scanStatsRaw.total || 0);

const scanRate =
  totalTickets === 0 ? 0 : Number(((totalScanned / totalTickets) * 100).toFixed(1));

// -------------------------------
// 4. Sales Velocity (last 30 days)
// -------------------------------
const salesVelocity = await this.ticketRepository
  .createQueryBuilder('t')
  .select(`DATE(t.createdAt)`, 'date')
  .addSelect('COUNT(*)', 'ticketsSold')
  .where('t.eventId = :eventId', { eventId })
  .andWhere('t.createdAt >= NOW() - INTERVAL \'30 days\'')
  .groupBy('date')
  .orderBy('date', 'ASC')
  .getRawMany();

const formattedVelocity = salesVelocity.map((row) => ({
  date: row.date,
  ticketsSold: Number(row.ticketsSold),
}));

const result = {
  eventId,
  title: event.title,
  salesByTicketType,
  totalRevenue: Number(revenue),
  scanStats: {
    totalScanned,
    scanRate,
  },
  salesVelocity: formattedVelocity,
  generatedAt: new Date().toISOString(),
};

// ✅ cache for 5 mins
await this.cacheManager.set(cacheKey, result, 300);

return result;
}
  private mapToEventDetailResponse(event: Event): EventDetailResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      eventClosingDate: event.eventClosingDate,
      capacity: event.capacity,
      status: event.status,
      isArchived: event.isArchived,
      venue: event.venue,
      city: event.city,
      countryCode: event.countryCode,
      tags: event.tags,
      isVirtual: event.isVirtual,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      ticketTypes: (event.ticketTypes ?? []).map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        priceType: ticketType.priceType,
        price: Number(ticketType.price),
        totalQuantity: ticketType.totalQuantity,
        soldQuantity: ticketType.soldQuantity,
        remainingQuantity: ticketType.getRemainingQuantity(),
        isAvailableNow: ticketType.isAvailableNow(),
        saleStartsAt: ticketType.saleStartsAt ?? null,
        saleEndsAt: ticketType.saleEndsAt ?? null,
      })),
    };
  }
}
