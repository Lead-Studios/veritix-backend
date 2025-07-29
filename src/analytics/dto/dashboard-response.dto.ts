export class AttendanceStatsDto {
  date: string;
  totalAttendees: number;
  totalSessions: number;
  averageAttendancePerSession: number;
}

export class SessionPopularityDto {
  sessionId: string;
  sessionTitle: string;
  speakerName: string;
  track: string;
  attendeeCount: number;
  capacity: number;
  attendanceRate: number;
  scheduledStartTime: Date;
}

export class SpeakerPunctualityDto {
  speakerName: string;
  totalSessions: number;
  onTimeSessions: number;
  lateSessions: number;
  averageDelayMinutes: number;
  punctualityRate: number;
}

export class SessionOverlapDto {
  timeSlot: string;
  overlappingSessions: number;
  totalAttendees: number;
  averageAttendeesPerSession: number;
}

export class FeedbackStatsDto {
  sessionId: string;
  sessionTitle: string;
  speakerName: string;
  averageRating: number;
  totalFeedbacks: number;
  ratingDistribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
}

export class DashboardResponseDto {
  attendancePerDay: AttendanceStatsDto[];
  mostAttendedSessions: SessionPopularityDto[];
  leastAttendedSessions: SessionPopularityDto[];
  speakerPunctuality: SpeakerPunctualityDto[];
  sessionOverlaps: SessionOverlapDto[];
  feedbackStats: FeedbackStatsDto[];
  summary: {
    totalConferences: number;
    totalSessions: number;
    totalAttendees: number;
    averageFeedbackScore: number;
    overallPunctualityRate: number;
  };
}
