import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { AnalyticsFiltersDto } from '../analytics/dto/analytics-filters.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async getAverageFeedbackBySession(filters: AnalyticsFiltersDto) {
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .innerJoin('feedback.session', 'session')
      .leftJoin('session.speaker', 'speaker');
    
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
    
    if (filters.speakerIds && filters.speakerIds.length > 0) {
      queryBuilder.andWhere('session.speakerId IN (:...speakerIds)', { speakerIds: filters.speakerIds });
    }
    
    if (filters.conferenceId) {
      queryBuilder.andWhere('session.conferenceId = :conferenceId', { conferenceId: filters.conferenceId });
    }


}
  