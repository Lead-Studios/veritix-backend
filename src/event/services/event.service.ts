import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from '../dtos/event.dto';
import { Event } from '../entities/event.entity';
import { EventResource } from '../resources/event.resource';

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

  findAll() {
    return this.eventRepo.find({ relations: ['images'] }).then(EventResource.toArray);
  }
} 