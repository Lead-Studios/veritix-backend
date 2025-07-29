import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeFilter {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export class SessionAnalyticsFilterDto {
  @ApiPropertyOptional({
    enum: TimeFilter,
    description: 'Time interval filter for analytics data',
  })
  @IsOptional()
  @IsEnum(TimeFilter)
  timeFilter?: TimeFilter;

  @ApiPropertyOptional({
    description: 'Filter by specific track',
  })
  @IsOptional()
  track?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific speaker',
  })
  @IsOptional()
  speaker?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Conference ID to filter sessions',
  })
  @IsOptional()
  @IsUUID()
  conferenceId?: string;

  @ApiPropertyOptional({
    description: 'Export data to CSV format',
  })
  @IsOptional()
  exportToCsv?: boolean;

  @ApiPropertyOptional({
    description: 'Export data to PDF format',
  })
  @IsOptional()
  exportToPdf?: boolean;
}

export class SessionAttendanceDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  sessionTitle: string;

  @ApiProperty()
  speakerName: string;

  @ApiProperty()
  track: string;

  @ApiProperty()
  scheduledStartTime: string;

  @ApiProperty()
  scheduledEndTime: string;

  @ApiProperty()
  actualStartTime?: string;

  @ApiProperty()
  actualEndTime?: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  attendanceCount: number;

  @ApiProperty()
  attendancePercentage: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  feedbackCount: number;

  @ApiProperty()
  punctualityScore: number; // Percentage of on-time starts

  @ApiProperty()
  duration: number; // in minutes
}

export class DailyAttendanceDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendance: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  onTimeSessions: number;

  @ApiProperty()
  punctualityPercentage: number;
}

export class SpeakerAnalyticsDto {
  @ApiProperty()
  speakerName: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendance: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  punctualityScore: number;

  @ApiProperty()
  totalFeedback: number;
}

export class TrackAnalyticsDto {
  @ApiProperty()
  track: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendance: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  punctualityScore: number;
}

export class SessionOverlapDto {
  @ApiProperty()
  timeSlot: string;

  @ApiProperty()
  overlappingSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendancePerSession: number;

  @ApiProperty()
  sessions: string[];
}

export class SessionAnalyticsDashboardDto {
  @ApiProperty()
  conferenceId: string;

  @ApiProperty()
  conferenceName: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendance: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  overallPunctualityScore: number;

  @ApiProperty()
  period: {
    start: string;
    end: string;
  };

  @ApiProperty({ type: [SessionAttendanceDto] })
  topSessions: SessionAttendanceDto[];

  @ApiProperty({ type: [SessionAttendanceDto] })
  leastAttendedSessions: SessionAttendanceDto[];

  @ApiProperty({ type: [DailyAttendanceDto] })
  dailyAttendance: DailyAttendanceDto[];

  @ApiProperty({ type: [SpeakerAnalyticsDto] })
  speakerAnalytics: SpeakerAnalyticsDto[];

  @ApiProperty({ type: [TrackAnalyticsDto] })
  trackAnalytics: TrackAnalyticsDto[];

  @ApiProperty({ type: [SessionOverlapDto] })
  sessionOverlaps: SessionOverlapDto[];

  @ApiProperty()
  filter?: SessionAnalyticsFilterDto;
}

export class SessionAnalyticsSummaryDto {
  @ApiProperty()
  conferenceId: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAttendance: number;

  @ApiProperty()
  averageAttendance: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  punctualityScore: number;

  @ApiProperty()
  mostAttendedSession: {
    title: string;
    attendance: number;
    speaker: string;
  };

  @ApiProperty()
  leastAttendedSession: {
    title: string;
    attendance: number;
    speaker: string;
  };

  @ApiProperty()
  topRatedSession: {
    title: string;
    rating: number;
    speaker: string;
  };

  @ApiProperty()
  mostPunctualSpeaker: {
    name: string;
    score: number;
  };
}
