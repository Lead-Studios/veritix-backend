import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sponsor } from '../sponsor.entity';
import { Event } from 'src/events/entities/event.entity';

/**
 * Service provider for geting sponsors by event.
 */
@Injectable()
export class FindSponsorsByEventProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  /**
   * Retrieves sponsors based on events from the database.
   * 
   * @returns {Promise<Sponsor[]>} A list of sponsors for a particular event.
   * @throws {InternalServerErrorException} If an error occurs while fetching sponsors.
   */
  async findByEvent(eventId: number): Promise<Sponsor[]> {
    try {
      return await this.sponsorsRepository
        .createQueryBuilder('sponsor')
        .innerJoin('sponsor.events', 'event')
        .where('event.id = :eventId', { eventId })
        .getMany();
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving sponsors for event');
    }
  }
  
}
