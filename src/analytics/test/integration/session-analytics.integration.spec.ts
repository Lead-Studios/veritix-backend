import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { SessionAnalyticsController } from '../../controllers/session-analytics.controller';
import { SessionAnalyticsService } from '../../services/session-analytics.service';
import { ExportService } from '../../services/export.service';
import { Session } from '../../entities/session.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Feedback } from '../../entities/feedback.entity';
import { Conference } from '../../entities/conference.entity';
import { SessionAnalyticsFilterDto } from '../../dto/session-analytics.dto';

describe('SessionAnalytics Integration', () => {
  let app: INestApplication;
  let sessionRepository: Repository<Session>;
  let attendanceRepository: Repository<Attendance>;
  let feedbackRepository: Repository<Feedback>;
  let conferenceRepository: Repository<Conference>;

  const mockConference = {
    id: 'conf-123',
    name: 'Test Conference',
    organizerId: 'organizer-123',
    description: 'Test conference description',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-17'),
    location: 'Test Location',
    capacity: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSessions = [
    {
      id: 'session-1',
      title: 'Introduction to TypeScript',
      description: 'Learn TypeScript basics',
      speakerName: 'John Doe',
      track: 'Technology',
      scheduledStartTime: new Date('2024-01-15T10:00:00Z'),
      scheduledEndTime: new Date('2024-01-15T11:00:00Z'),
      actualStartTime: new Date('2024-01-15T10:00:00Z'),
      actualEndTime: new Date('2024-01-15T11:00:00Z'),
      capacity: 100,
      conferenceId: 'conf-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'session-2',
      title: 'Advanced JavaScript Patterns',
      description: 'Advanced JavaScript concepts',
      speakerName: 'Jane Smith',
      track: 'Technology',
      scheduledStartTime: new Date('2024-01-15T14:00:00Z'),
      scheduledEndTime: new Date('2024-01-15T15:00:00Z'),
      actualStartTime: new Date('2024-01-15T14:05:00Z'),
      actualEndTime: new Date('2024-01-15T15:00:00Z'),
      capacity: 80,
      conferenceId: 'conf-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'session-3',
      title: 'Business Strategy Workshop',
      description: 'Strategic business planning',
      speakerName: 'Bob Johnson',
      track: 'Business',
      scheduledStartTime: new Date('2024-01-16T09:00:00Z'),
      scheduledEndTime: new Date('2024-01-16T10:30:00Z'),
      actualStartTime: new Date('2024-01-16T09:00:00Z'),
      actualEndTime: new Date('2024-01-16T10:30:00Z'),
      capacity: 50,
      conferenceId: 'conf-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockAttendances = [
    {
      id: 'attendance-1',
      sessionId: 'session-1',
      attendeeId: 'attendee-1',
      checkInTime: new Date('2024-01-15T09:55:00Z'),
      checkOutTime: new Date('2024-01-15T11:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'attendance-2',
      sessionId: 'session-1',
      attendeeId: 'attendee-2',
      checkInTime: new Date('2024-01-15T09:58:00Z'),
      checkOutTime: new Date('2024-01-15T11:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'attendance-3',
      sessionId: 'session-2',
      attendeeId: 'attendee-1',
      checkInTime: new Date('2024-01-15T14:03:00Z'),
      checkOutTime: new Date('2024-01-15T15:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'attendance-4',
      sessionId: 'session-3',
      attendeeId: 'attendee-3',
      checkInTime: new Date('2024-01-16T08:58:00Z'),
      checkOutTime: new Date('2024-01-16T10:30:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFeedbacks = [
    {
      id: 'feedback-1',
      sessionId: 'session-1',
      attendeeId: 'attendee-1',
      rating: 5,
      comment: 'Excellent session!',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'feedback-2',
      sessionId: 'session-1',
      attendeeId: 'attendee-2',
      rating: 4,
      comment: 'Very informative',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'feedback-3',
      sessionId: 'session-2',
      attendeeId: 'attendee-1',
      rating: 3,
      comment: 'Good but could be better',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'feedback-4',
      sessionId: 'session-3',
      attendeeId: 'attendee-3',
      rating: 5,
      comment: 'Amazing workshop!',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Session, Attendance, Feedback, Conference],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Session, Attendance, Feedback, Conference]),
      ],
      controllers: [SessionAnalyticsController],
      providers: [SessionAnalyticsService, ExportService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sessionRepository = moduleFixture.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
    attendanceRepository = moduleFixture.get<Repository<Attendance>>(
      getRepositoryToken(Attendance),
    );
    feedbackRepository = moduleFixture.get<Repository<Feedback>>(
      getRepositoryToken(Feedback),
    );
    conferenceRepository = moduleFixture.get<Repository<Conference>>(
      getRepositoryToken(Conference),
    );

    // Seed test data
    await conferenceRepository.save(mockConference);
    await sessionRepository.save(mockSessions);
    await attendanceRepository.save(mockAttendances);
    await feedbackRepository.save(mockFeedbacks);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/sessions/dashboard/:organizerId', () => {
    it('should return session analytics dashboard', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.conferenceId).toBe('conf-123');
      expect(response.body.conferenceName).toBe('Test Conference');
      expect(response.body.totalSessions).toBe(3);
      expect(response.body.totalAttendance).toBe(4);
      expect(response.body.averageAttendance).toBeGreaterThan(0);
      expect(response.body.averageRating).toBeGreaterThan(0);
      expect(response.body.overallPunctualityScore).toBeGreaterThan(0);
      expect(response.body.topSessions).toBeDefined();
      expect(response.body.leastAttendedSessions).toBeDefined();
      expect(response.body.dailyAttendance).toBeDefined();
      expect(response.body.speakerAnalytics).toBeDefined();
      expect(response.body.trackAnalytics).toBeDefined();
      expect(response.body.sessionOverlaps).toBeDefined();
    });

    it('should filter by track', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
        track: 'Technology',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body.totalSessions).toBe(2); // Only Technology track sessions
      expect(response.body.trackAnalytics).toHaveLength(1);
      expect(response.body.trackAnalytics[0].track).toBe('Technology');
    });

    it('should filter by speaker', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
        speaker: 'John Doe',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body.totalSessions).toBe(1); // Only John Doe's session
      expect(response.body.speakerAnalytics).toHaveLength(1);
      expect(response.body.speakerAnalytics[0].speakerName).toBe('John Doe');
    });

    it('should filter by specific date', async () => {
      const filters: SessionAnalyticsFilterDto = {
        date: '2024-01-15',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body.totalSessions).toBe(2); // Only sessions on 2024-01-15
      expect(response.body.dailyAttendance).toHaveLength(1);
    });

    it('should handle non-existent organizer', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/non-existent-organizer')
        .query(filters)
        .expect(200);

      expect(response.body.totalSessions).toBe(0);
      expect(response.body.totalAttendance).toBe(0);
    });

    it('should export to CSV', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
        exportToCsv: true,
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'session-analytics.csv',
      );
    });
  });

  describe('GET /analytics/sessions/summary/:organizerId', () => {
    it('should return session analytics summary', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/summary/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.conferenceId).toBe('conf-123');
      expect(response.body.totalSessions).toBe(3);
      expect(response.body.totalAttendance).toBe(4);
      expect(response.body.averageAttendance).toBeGreaterThan(0);
      expect(response.body.averageRating).toBeGreaterThan(0);
      expect(response.body.punctualityScore).toBeGreaterThan(0);
      expect(response.body.mostAttendedSession).toBeDefined();
      expect(response.body.leastAttendedSession).toBeDefined();
      expect(response.body.topRatedSession).toBeDefined();
      expect(response.body.mostPunctualSpeaker).toBeDefined();
    });

    it('should handle empty data', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'non-existent',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/summary/organizer-123')
        .query(filters)
        .expect(200);

      expect(response.body.totalSessions).toBe(0);
      expect(response.body.totalAttendance).toBe(0);
      expect(response.body.averageAttendance).toBe(0);
      expect(response.body.averageRating).toBe(0);
      expect(response.body.punctualityScore).toBe(0);
    });
  });

  describe('GET /analytics/sessions/tracks/:conferenceId', () => {
    it('should return available tracks', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/tracks/conf-123')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('Technology');
      expect(response.body).toContain('Business');
    });
  });

  describe('GET /analytics/sessions/speakers/:conferenceId', () => {
    it('should return available speakers', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/speakers/conf-123')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('John Doe');
      expect(response.body).toContain('Jane Smith');
      expect(response.body).toContain('Bob Johnson');
    });
  });

  describe('Data accuracy tests', () => {
    it('should calculate attendance correctly', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      // Session 1 has 2 attendees
      const session1 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-1',
      );
      expect(session1.attendanceCount).toBe(2);

      // Session 2 has 1 attendee
      const session2 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-2',
      );
      expect(session2.attendanceCount).toBe(1);

      // Session 3 has 1 attendee
      const session3 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-3',
      );
      expect(session3.attendanceCount).toBe(1);
    });

    it('should calculate ratings correctly', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      // Session 1 has ratings 5 and 4 (average 4.5)
      const session1 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-1',
      );
      expect(session1.averageRating).toBe(4.5);
      expect(session1.feedbackCount).toBe(2);

      // Session 2 has rating 3 (average 3.0)
      const session2 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-2',
      );
      expect(session2.averageRating).toBe(3.0);
      expect(session2.feedbackCount).toBe(1);
    });

    it('should calculate punctuality correctly', async () => {
      const filters: SessionAnalyticsFilterDto = {
        timeFilter: 'week',
        conferenceId: 'conf-123',
      };

      const response = await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(200);

      // Session 1: on time (10:00:00 <= 10:00:00)
      const session1 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-1',
      );
      expect(session1.punctualityScore).toBe(100);

      // Session 2: late (14:05:00 > 14:00:00)
      const session2 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-2',
      );
      expect(session2.punctualityScore).toBe(0);

      // Session 3: on time (09:00:00 <= 09:00:00)
      const session3 = response.body.topSessions.find(
        (s: any) => s.sessionId === 'session-3',
      );
      expect(session3.punctualityScore).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid time filter', async () => {
      const filters = {
        timeFilter: 'invalid',
        conferenceId: 'conf-123',
      };

      await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(400); // Bad request due to validation error
    });

    it('should handle invalid date format', async () => {
      const filters = {
        date: 'invalid-date',
        conferenceId: 'conf-123',
      };

      await request(app.getHttpServer())
        .get('/analytics/sessions/dashboard/organizer-123')
        .query(filters)
        .expect(400); // Bad request due to validation error
    });
  });
});
