import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { AnalyticsFiltersDto } from '../analytics/dto/analytics-filters.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  async findAll(filters: AnalyticsFiltersDto): Promise<Session[]> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.speaker', 'speaker');
    
    // Apply filters
    if (filters.startDate) {
      queryBuilder.andWhere('session.scheduledStartTime >= :startDate', { startDate: filters.startDate });
    }
    
    if (filters.endDate) {
      queryBuilder.andWhere('session.scheduledStartTime <= :endDate', { endDate: filters.endDate });
    }
    
    if (filters.tracks && filters.tracks.length > 0) {
      queryBuilder.andWhere('session.track IN (:...tracks)', { tracks: filters.tracks });
    }
    
    if (filters.days && filters.days.length > 0) {
      queryBuilder.andWhere('DATE(session.scheduledStartTime) IN (:...days)', { days: filters.days });
    }
    
    if (filters.speakerIds && filters.speakerIds.length > 0) {
      queryBuilder.andWhere('session.speakerId IN (:...speakerIds)', { speakerIds: filters.speakerIds });
    }
    
    if (filters.conferenceId) {
      queryBuilder.andWhere('session.conferenceId = :conferenceId', { conferenceId: filters.conferenceId });
    }

    return queryBuilder.getMany();
  }
}