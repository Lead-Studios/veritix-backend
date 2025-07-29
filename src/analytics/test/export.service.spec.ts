import { Test, type TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';
import { jest } from '@jest/globals';

describe('ExportService', () => {
  let service: ExportService;

  const mockResponse = {
    setHeader: jest.fn(),
    send: jest.fn(),
    pipe: jest.fn(),
  } as unknown as Response;

  const mockDashboardData: DashboardResponseDto = {
    attendancePerDay: [
      {
        date: '2024-03-15',
        totalAttendees: 50,
        totalSessions: 3,
        averageAttendancePerSession: 16.67,
      },
    ],
    mostAttendedSessions: [
      {
        sessionId: 'session-1',
        sessionTitle: 'Test Session',
        speakerName: 'John Doe',
        track: 'Tech',
        attendeeCount: 50,
        capacity: 100,
        attendanceRate: 50,
        scheduledStartTime: new Date('2024-03-15T09:00:00'),
      },
    ],
    leastAttendedSessions: [],
    speakerPunctuality: [
      {
        speakerName: 'John Doe',
        totalSessions: 2,
        onTimeSessions: 1,
        lateSessions: 1,
        averageDelayMinutes: 5,
        punctualityRate: 50,
      },
    ],
    sessionOverlaps: [],
    feedbackStats: [
      {
        sessionId: 'session-1',
        sessionTitle: 'Test Session',
        speakerName: 'John Doe',
        averageRating: 4.5,
        totalFeedbacks: 10,
        ratingDistribution: {
          rating1: 0,
          rating2: 1,
          rating3: 2,
          rating4: 3,
          rating5: 4,
        },
      },
    ],
    summary: {
      totalConferences: 2,
      totalSessions: 5,
      totalAttendees: 25,
      averageFeedbackScore: 4.2,
      overallPunctualityRate: 85.5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToCsv', () => {
    it('should generate and send CSV content', async () => {
      await service.exportToCsv(mockDashboardData, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-analytics.csv',
      );
      expect(mockResponse.send).toHaveBeenCalled();

      const csvContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(csvContent).toContain('SUMMARY');
      expect(csvContent).toContain('Total Conferences,2');
      expect(csvContent).toContain('ATTENDANCE PER DAY');
      expect(csvContent).toContain('2024-03-15,50,3,16.67');
      expect(csvContent).toContain('MOST ATTENDED SESSIONS');
      expect(csvContent).toContain('Test Session');
      expect(csvContent).toContain('SPEAKER PUNCTUALITY');
      expect(csvContent).toContain('John Doe');
      expect(csvContent).toContain('FEEDBACK STATISTICS');
    });
  });

  describe('exportToPdf', () => {
    it('should generate and send PDF content', async () => {
      // Mock PDFDocument
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        addPage: jest.fn().mockReturnThis(),
        pipe: jest.fn(),
        end: jest.fn(),
      };

      // Mock PDFDocument constructor
      jest.doMock('pdfkit', () => jest.fn(() => mockDoc));

      await service.exportToPdf(mockDashboardData, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-analytics.pdf',
      );
    });
  });
});
