import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from '../dtos/event.dto';
import { Event } from '../../events/entities/event.entity';
import { EventResource } from '../resources/event.resource';
import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { Like, ILike } from 'typeorm';

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  create(dto: CreateEventDto) {
    const event = this.eventRepo.create(dto);
    return this.eventRepo.save(event).then(EventResource.toResponse);
  }

  // findAll() {
  //   return this.eventRepo.find({ relations: ['images'] }).then(EventResource.toArray);
  // }

  async findAll(filters: {
    name?: string;
    location?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ReturnType<typeof EventResource.toResponse>>> {
    const { name, location, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.images', 'images')
      .leftJoinAndSelect('event.sponsors', 'sponsors')
      .leftJoinAndSelect('event.collaborators', 'collaborators');

    if (name) {
      queryBuilder.andWhere('event.name LIKE :name', { name: `%${name}%` });
    }

    if (location) {
      queryBuilder.andWhere(
        '(event.location LIKE :location OR ' +
        'event.country LIKE :location OR ' +
        'event.state LIKE :location OR ' +
        'event.street LIKE :location OR ' +
        'event.localGovernment LIKE :location)',
        { location: `%${location}%` }
      );
    }

    const [events, total] = await queryBuilder
      .take(limit)
      .skip(skip)
      .orderBy('event.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: EventResource.toArray(events), 
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async searchEvents({ query, category, location, page = 1, limit = 20 }) {
    // Validate and sanitize inputs
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const qb = this.eventRepo.createQueryBuilder('event');

    if (category) {
      qb.andWhere('event.category ILIKE :category', { category: `%${category}%` });
    }
    if (location) {
      const [country, state, city] = location.split(',').map((s) => s.trim());
      if (country) qb.andWhere('event.country ILIKE :country', { country: `%${country}%` });
      if (state) qb.andWhere('event.state ILIKE :state', { state: `%${state}%` });
      if (city) qb.andWhere('event.city ILIKE :city', { city: `%${city}%` });
    }
    // For fuzzy name search, fetch a reasonable set and rank in-memory
    let events: Event[] = [];
    let total = 0;
    if (query) {
      // Fetch candidates with loose LIKE
      const candidates = await qb
        .andWhere('event.name ILIKE :name', { name: `%${query}%` })
        .getMany();
      // Fuzzy rank
      const scored = candidates.map((event) => {
        const dist = levenshtein(event.name, query);
        // Extra penalty if typo is in first/last 3 letters
        let penalty = 0;
        if (event.name.slice(0, 3).toLowerCase() !== query.slice(0, 3).toLowerCase()) penalty += 1;
        if (event.name.slice(-3).toLowerCase() !== query.slice(-3).toLowerCase()) penalty += 1;
        return { event, score: dist + penalty };
      });
      scored.sort((a, b) => a.score - b.score);
      total = scored.length;
      events = scored.slice((page - 1) * limit, page * limit).map((s) => s.event);
    } else {
      // No query: just paginate filtered events
      [events, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    }
    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
} 