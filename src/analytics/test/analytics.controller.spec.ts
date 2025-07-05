import { Test, type TestingModule } from "@nestjs/testing"
import type { Response } from "express"
import { AnalyticsController } from "../controllers/analytics.controller"
import { AnalyticsService } from "../services/analytics.service"
import { ExportService } from "../services/export.service"
import type { AnalyticsFilterDto } from "../dto/analytics-filter.dto"
import type { DashboardResponseDto } from "../dto/dashboard-response.dto"
import { jest } from "@jest/globals"

describe("AnalyticsController", () => {
  let controller: AnalyticsController
  let analyticsService: AnalyticsService
  let exportService: ExportService

  const mockAnalyticsService = {
    getDashboardData: jest.fn(),
    getConferencesByOrganizer: jest.fn(),
    getTracksByConference: jest.fn(),
    getSpeakersByConference: jest.fn(),
  }

  const mockExportService = {
    exportToCsv: jest.fn(),
    exportToPdf: jest.fn(),
  }

  const mockResponse = {
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile()

    controller = module.get<AnalyticsController>(AnalyticsController)
    analyticsService = module.get<AnalyticsService>(AnalyticsService)
    exportService = module.get<ExportService>(ExportService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("getDashboard", () => {
    const organizerId = "test-organizer-id"
    const mockDashboardData: DashboardResponseDto = {
      attendancePerDay: [],
      mostAttendedSessions: [],
      leastAttendedSessions: [],
      speakerPunctuality: [],
      sessionOverlaps: [],
      feedbackStats: [],
      summary: {
        totalConferences: 1,
        totalSessions: 5,
        totalAttendees: 25,
        averageFeedbackScore: 4.2,
        overallPunctualityRate: 85.5,
      },
    }

    it("should return dashboard data as JSON", async () => {
      const filters: AnalyticsFilterDto = {}
      mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData)

      const result = await controller.getDashboard(organizerId, filters, mockResponse)

      expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith(organizerId, filters)
      expect(mockResponse.json).toHaveBeenCalledWith(mockDashboardData)
    })

    it("should export to CSV when exportToCsv is true", async () => {
      const filters: AnalyticsFilterDto = { exportToCsv: true }
      mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData)

      await controller.getDashboard(organizerId, filters, mockResponse)

      expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith(organizerId, filters)
      expect(mockExportService.exportToCsv).toHaveBeenCalledWith(mockDashboardData, mockResponse)
    })

    it("should export to PDF when exportToPdf is true", async () => {
      const filters: AnalyticsFilterDto = { exportToPdf: true }
      mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData)

      await controller.getDashboard(organizerId, filters, mockResponse)

      expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith(organizerId, filters)
      expect(mockExportService.exportToPdf).toHaveBeenCalledWith(mockDashboardData, mockResponse)
    })

    it("should return data directly when no response object provided", async () => {
      const filters: AnalyticsFilterDto = {}
      mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData)

      const result = await controller.getDashboard(organizerId, filters)

      expect(result).toEqual(mockDashboardData)
      expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith(organizerId, filters)
    })
  })

  describe("getConferences", () => {
    it("should return conferences for organizer", async () => {
      const organizerId = "test-organizer-id"
      const mockConferences = [{ id: "conf-1", name: "Test Conference", organizerId }]

      mockAnalyticsService.getConferencesByOrganizer.mockResolvedValue(mockConferences)

      const result = await controller.getConferences(organizerId)

      expect(result).toEqual(mockConferences)
      expect(mockAnalyticsService.getConferencesByOrganizer).toHaveBeenCalledWith(organizerId)
    })
  })

  describe("getTracks", () => {
    it("should return tracks for conference", async () => {
      const conferenceId = "conference-1"
      const mockTracks = ["Tech", "Business"]

      mockAnalyticsService.getTracksByConference.mockResolvedValue(mockTracks)

      const result = await controller.getTracks(conferenceId)

      expect(result).toEqual(mockTracks)
      expect(mockAnalyticsService.getTracksByConference).toHaveBeenCalledWith(conferenceId)
    })
  })

  describe("getSpeakers", () => {
    it("should return speakers for conference", async () => {
      const conferenceId = "conference-1"
      const mockSpeakers = ["John Doe", "Jane Smith"]

      mockAnalyticsService.getSpeakersByConference.mockResolvedValue(mockSpeakers)

      const result = await controller.getSpeakers(conferenceId)

      expect(result).toEqual(mockSpeakers)
      expect(mockAnalyticsService.getSpeakersByConference).toHaveBeenCalledWith(conferenceId)
    })
  })
})
