import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { SessionsService } from '../sessions/sessions.service';
import { SpeakersService } from '../speakers/speakers.service';
import { FeedbackService } from '../feedback/feedback.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import * as ExportUtils from '../../common/utils/export.util';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly sessionsService: SessionsService,
    private readonly speakersService: SpeakersService,
    private readonly feedbackService: FeedbackService,
  ) {}

  async getDashboardAnalytics(filters: AnalyticsFiltersDto) {
    // Get all the analytics needed for the dashboard overview
    const [
      dailyAttendance,
      sessionAttendance,
      popularSessions,
      averageFeedback,
      speakerPunctuality,
      sessionOverlap,
    ] = await Promise.all([
      this.getDailyAttendance(filters),
      this.getSessionAttendance(filters),
      this.getPopularSessions(filters),
      this.getAverageFeedback(filters),
      this.getSpeakerPunctuality(filters),
      this.getSessionOverlap(filters),
    ]);

    return {
      dailyAttendance,
      sessionAttendance,
      popularSessions,
      averageFeedback,
      speakerPunctuality,
      sessionOverlap,
    };
  }

  async getDailyAttendance(filters: AnalyticsFiltersDto) {
    return this.attendanceService.getDailyAttendance(filters);
  }

  async getSessionAttendance(filters: AnalyticsFiltersDto) {
    return this.attendanceService.getSessionAttendance(filters);
  }

  async getPopularSessions(filters: AnalyticsFiltersDto) {
    const allSessions = await this.sessionsService.findAll(filters);
    const sessionAttendance = await this.attendanceService.getSessionAttendance(filters);
    
    // Sort sessions by attendance count
    const sessionsWithAttendance = allSessions.map(session => {
      const attendance = sessionAttendance.find(a => a.sessionId === session.id)?.count || 0;
      return { ...session, attendanceCount: attendance };
    });
    
    const sortedSessions = [...sessionsWithAttendance].sort((a, b) => b.attendanceCount - a.attendanceCount);
    
    return {
      mostAttended: sortedSessions.slice(0, 5),
      leastAttended: sortedSessions.slice(-5).reverse(),
    };
  }

  async getAverageFeedback(filters: AnalyticsFiltersDto) {
    return this.feedbackService.getAverageFeedbackBySession(filters);
  }

  async getSpeakerPunctuality(filters: AnalyticsFiltersDto) {
    const sessions = await this.sessionsService.findAll(filters);
    
    return sessions.map(session => {
      const punctualityInMinutes = session.actualStartTime
        ? Math.floor((session.actualStartTime.getTime() - session.scheduledStartTime.getTime()) / 60000)
        : null;
      
      return {
        sessionId: session.id,
        sessionTitle: session.title,
        speakerId: session.speakerId,
        speakerName: session.speaker.name,
        scheduledStartTime: session.scheduledStartTime,
        actualStartTime: session.actualStartTime,
        punctualityInMinutes,
        isOnTime: punctualityInMinutes !== null ? punctualityInMinutes <= 0 : null,
      };
    });
  }

  async getSessionOverlap(filters: AnalyticsFiltersDto) {
    const sessions = await this.sessionsService.findAll(filters);
    
    const overlappingSessions = [];
    
    // Find overlapping sessions
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const session1 = sessions[i];
        const session2 = sessions[j];
        
        // Check if sessions overlap
        const session1Start = session1.scheduledStartTime;
        const session1End = new Date(session1.scheduledStartTime.getTime() + session1.durationMinutes * 60000);
        const session2Start = session2.scheduledStartTime;
        const session2End = new Date(session2.scheduledStartTime.getTime() + session2.durationMinutes * 60000);
        
        if (
          (session1Start <= session2End && session1End >= session2Start) &&
          session1.track !== session2.track // Only consider overlap across different tracks
        ) {
          const overlapStartTime = new Date(Math.max(session1Start.getTime(), session2Start.getTime()));
          const overlapEndTime = new Date(Math.min(session1End.getTime(), session2End.getTime()));
          const overlapMinutes = Math.floor((overlapEndTime.getTime() - overlapStartTime.getTime()) / 60000);
          
          if (overlapMinutes > 0) {
            overlappingSessions.push({
              session1: {
                id: session1.id,
                title: session1.title,
                track: session1.track,
                startTime: session1Start,
                endTime: session1End,
              },
              session2: {
                id: session2.id,
                title: session2.title,
                track: session2.track,
                startTime: session2Start,
                endTime: session2End,
              },
              overlapMinutes,
              overlapStartTime,
              overlapEndTime,
            });
          }
        }
      }
    }
    
    return {
      totalOverlappingSessions: overlappingSessions.length,
      overlappingSessions,
    };
  }

  async exportAnalyticsData(filters: AnalyticsFiltersDto, format: 'csv' | 'pdf') {
    const dashboardData = await this.getDashboardAnalytics(filters);
    
    if (format === 'csv') {
      return ExportUtils.convertToCsv(dashboardData);
    } else {
      return ExportUtils.convertToPdf(dashboardData);
    }
  }
}
