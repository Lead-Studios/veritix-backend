import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { AnalyticsFiltersDto } from '../analytics/dto/analytics-filters.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async getDailyAttendance(filters: AnalyticsFiltersDto) {
    // Create query builder
    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.session', 'session');

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
    
    if (filters.conferenceId) {
      queryBuilder.andWhere('session.conferenceId = :conferenceId', { conferenceId: filters.conferenceId });
    }

    // Get the date only from the session start time
    const attendanceByDay = await queryBuilder
      .select('DATE(session.scheduledStartTime)', 'date')
      .addSelect('COUNT(DISTINCT attendance.attendeeId)', 'uniqueAttendees')
      .addSelect('COUNT(attendance.id)', 'totalCheckins')
      .groupBy('DATE(session.scheduledStartTime)')
      .orderBy('DATE(session.scheduledStartTime)', 'ASC')
      .getRawMany();

    return attendanceByDay;
  }

  async getSessionAttendance(filters: AnalyticsFiltersDto) {
    // Create query builder
    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.session', 'session');

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

    // Get attendance by session
    const attendanceBySession = await queryBuilder
      .select('session.id', 'sessionId')
      .addSelect('session.title', 'sessionTitle')
      .addSelect('session.track', 'track')
      .addSelect('COUNT(DISTINCT attendance.attendeeId)', 'count')
      .groupBy('session.id')
      .addGroupBy('session.title')
      .addGroupBy('session.track')
      .orderBy('COUNT(DISTINCT attendance.attendeeId)', 'DESC')
      .getRawMany();

    return attendanceBySession;
  }
}