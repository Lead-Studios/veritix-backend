import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from '../dtos/event.dto';
import { Event } from '../entities/event.entity';
import { EventResource } from '../resources/event.resource';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

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
} 