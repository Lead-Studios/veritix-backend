import { Test, TestingModule } from '@nestjs/testing';
import { SessionAnalyticsController } from '../controllers/session-analytics.controller';
import { SessionAnalyticsService } from '../services/session-analytics.service';
import { ExportService } from '../services/export.service';
import { SessionAnalyticsFilterDto } from '../dto/session-analytics.dto';
import { Response } from 'express';

describe('SessionAnalyticsController', () => {
  let controller: SessionAnalyticsController;
  let sessionAnalyticsService: SessionAnalyticsService;
  let exportService: ExportService;

  const mockSessionAnalyticsService = {
    getSessionAnalyticsDashboard: jest.fn(),
    getSessionAnalyticsSummary: jest.fn(),
  };

  const mockExportService = {
    exportSessionAnalyticsToCsv: jest.fn(),
    exportSessionAnalyticsToPdf: jest.fn(),
  };

  const mockResponse = {
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionAnalyticsController],
      providers: [
        {
          provide: SessionAnalyticsService,
          useValue: mockSessionAnalyticsService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    controller = module.get<SessionAnalyticsController>(
      SessionAnalyticsController,
    );
    sessionAnalyticsService = module.get<SessionAnalyticsService>(
      SessionAnalyticsService,
    );
    exportService = module.get<ExportService>(ExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionAnalyticsDashboard', () => {
    const mockFilters: SessionAnalyticsFilterDto = {
      timeFilter: 'week',
      conferenceId: 'conf-123',
    };

    const mockDashboardData = {
      conferenceId: 'conf-123',
      conferenceName: 'Test Conference',
      totalSessions: 10,
      totalAttendance: 500,
      averageAttendance: 50,
      averageRating: 4.2,
      overallPunctualityScore: 80,
      period: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
      },
      topSessions: [],
      leastAttendedSessions: [],
      dailyAttendance: [],
      speakerAnalytics: [],
      trackAnalytics: [],
      sessionOverlaps: [],
      filter: mockFilters,
    };

    it('should return dashboard data as JSON when no export is requested', async () => {
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        mockFilters,
      );

      expect(result).toEqual(mockDashboardData);
      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('organizer-123', mockFilters);
    });

    it('should export to CSV when exportToCsv is true', async () => {
      const filtersWithCsvExport = { ...mockFilters, exportToCsv: true };
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportSessionAnalyticsToCsv.mockResolvedValue(
        undefined,
      );

      await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        filtersWithCsvExport,
        mockResponse,
      );

      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('organizer-123', filtersWithCsvExport);
      expect(exportService.exportSessionAnalyticsToCsv).toHaveBeenCalledWith(
        mockDashboardData,
        mockResponse,
      );
    });

    it('should export to PDF when exportToPdf is true', async () => {
      const filtersWithPdfExport = { ...mockFilters, exportToPdf: true };
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportSessionAnalyticsToPdf.mockResolvedValue(
        undefined,
      );

      await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        filtersWithPdfExport,
        mockResponse,
      );

      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('organizer-123', filtersWithPdfExport);
      expect(exportService.exportSessionAnalyticsToPdf).toHaveBeenCalledWith(
        mockDashboardData,
        mockResponse,
      );
    });

    it('should return JSON response when response object is provided', async () => {
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );

      await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        mockFilters,
        mockResponse,
      );

      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('organizer-123', mockFilters);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDashboardData);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockRejectedValue(
        error,
      );

      await expect(
        controller.getSessionAnalyticsDashboard('organizer-123', mockFilters),
      ).rejects.toThrow('Service error');
    });

    it('should handle all filter options correctly', async () => {
      const comprehensiveFilters: SessionAnalyticsFilterDto = {
        timeFilter: 'month',
        conferenceId: 'conf-123',
        track: 'Technology',
        speaker: 'John Doe',
        date: '2024-01-15',
        exportToCsv: false,
        exportToPdf: false,
      };

      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        comprehensiveFilters,
      );

      expect(result).toEqual(mockDashboardData);
      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('organizer-123', comprehensiveFilters);
    });
  });

  describe('getSessionAnalyticsSummary', () => {
    const mockFilters: SessionAnalyticsFilterDto = {
      timeFilter: 'week',
    };

    const mockSummaryData = {
      conferenceId: 'conf-123',
      totalSessions: 10,
      totalAttendance: 500,
      averageAttendance: 50,
      averageRating: 4.2,
      punctualityScore: 80,
      mostAttendedSession: {
        title: 'Most Popular Session',
        attendance: 100,
        speaker: 'John Doe',
      },
      leastAttendedSession: {
        title: 'Least Popular Session',
        attendance: 10,
        speaker: 'Jane Smith',
      },
      topRatedSession: {
        title: 'Top Rated Session',
        rating: 4.8,
        speaker: 'Bob Johnson',
      },
      mostPunctualSpeaker: {
        name: 'Alice Brown',
        score: 95,
      },
    };

    it('should return summary data', async () => {
      mockSessionAnalyticsService.getSessionAnalyticsSummary.mockResolvedValue(
        mockSummaryData,
      );

      const result = await controller.getSessionAnalyticsSummary(
        'organizer-123',
        mockFilters,
      );

      expect(result).toEqual(mockSummaryData);
      expect(
        sessionAnalyticsService.getSessionAnalyticsSummary,
      ).toHaveBeenCalledWith('organizer-123', mockFilters);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSessionAnalyticsService.getSessionAnalyticsSummary.mockRejectedValue(
        error,
      );

      await expect(
        controller.getSessionAnalyticsSummary('organizer-123', mockFilters),
      ).rejects.toThrow('Service error');
    });

    it('should handle all filter options correctly', async () => {
      const comprehensiveFilters: SessionAnalyticsFilterDto = {
        timeFilter: 'month',
        conferenceId: 'conf-123',
        track: 'Technology',
        speaker: 'John Doe',
        date: '2024-01-15',
      };

      mockSessionAnalyticsService.getSessionAnalyticsSummary.mockResolvedValue(
        mockSummaryData,
      );

      const result = await controller.getSessionAnalyticsSummary(
        'organizer-123',
        comprehensiveFilters,
      );

      expect(result).toEqual(mockSummaryData);
      expect(
        sessionAnalyticsService.getSessionAnalyticsSummary,
      ).toHaveBeenCalledWith('organizer-123', comprehensiveFilters);
    });
  });

  describe('getAvailableTracks', () => {
    it('should return available tracks for a conference', async () => {
      const result = await controller.getAvailableTracks('conf-123');

      expect(result).toEqual([
        'Technology',
        'Business',
        'Marketing',
        'Design',
        'Development',
      ]);
    });

    it('should return consistent track list', async () => {
      const result1 = await controller.getAvailableTracks('conf-123');
      const result2 = await controller.getAvailableTracks('conf-456');

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(5);
    });
  });

  describe('getAvailableSpeakers', () => {
    it('should return available speakers for a conference', async () => {
      const result = await controller.getAvailableSpeakers('conf-123');

      expect(result).toEqual([
        'John Doe',
        'Jane Smith',
        'Bob Johnson',
        'Alice Brown',
        'Charlie Wilson',
      ]);
    });

    it('should return consistent speaker list', async () => {
      const result1 = await controller.getAvailableSpeakers('conf-123');
      const result2 = await controller.getAvailableSpeakers('conf-456');

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(5);
    });
  });

  describe('parameter validation', () => {
    it('should handle empty organizerId', async () => {
      const emptyFilters: SessionAnalyticsFilterDto = {};
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getSessionAnalyticsDashboard(
        '',
        emptyFilters,
      );

      expect(result).toBeDefined();
      expect(
        sessionAnalyticsService.getSessionAnalyticsDashboard,
      ).toHaveBeenCalledWith('', emptyFilters);
    });

    it('should handle empty conferenceId', async () => {
      const emptyFilters: SessionAnalyticsFilterDto = {};
      mockSessionAnalyticsService.getSessionAnalyticsSummary.mockResolvedValue(
        mockSummaryData,
      );

      const result = await controller.getSessionAnalyticsSummary(
        'organizer-123',
        emptyFilters,
      );

      expect(result).toBeDefined();
      expect(
        sessionAnalyticsService.getSessionAnalyticsSummary,
      ).toHaveBeenCalledWith('organizer-123', emptyFilters);
    });
  });

  describe('export functionality', () => {
    it('should prioritize CSV export over PDF when both are requested', async () => {
      const filtersWithBothExports = {
        timeFilter: 'week',
        exportToCsv: true,
        exportToPdf: true,
      };
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportSessionAnalyticsToCsv.mockResolvedValue(
        undefined,
      );

      await controller.getSessionAnalyticsDashboard(
        'organizer-123',
        filtersWithBothExports,
        mockResponse,
      );

      expect(exportService.exportSessionAnalyticsToCsv).toHaveBeenCalledWith(
        mockDashboardData,
        mockResponse,
      );
      expect(exportService.exportSessionAnalyticsToPdf).not.toHaveBeenCalled();
    });

    it('should handle export service errors gracefully', async () => {
      const filtersWithCsvExport = { timeFilter: 'week', exportToCsv: true };
      mockSessionAnalyticsService.getSessionAnalyticsDashboard.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportSessionAnalyticsToCsv.mockRejectedValue(
        new Error('Export error'),
      );

      await expect(
        controller.getSessionAnalyticsDashboard(
          'organizer-123',
          filtersWithCsvExport,
          mockResponse,
        ),
      ).rejects.toThrow('Export error');
    });
  });
});
