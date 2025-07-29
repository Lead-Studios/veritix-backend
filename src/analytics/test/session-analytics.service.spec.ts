import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SessionAnalyticsService } from "../services/session-analytics.service"
import { Session } from "../entities/session.entity"
import { Attendance } from "../entities/attendance.entity"
import { Feedback } from "../entities/feedback.entity"
import { Conference } from "../entities/conference.entity"
import { SessionAnalyticsFilterDto } from "../dto/session-analytics.dto"

describe("SessionAnalyticsService", () => {
  let service: SessionAnalyticsService
  let sessionRepository: Repository<Session>
  let attendanceRepository: Repository<Attendance>
  let feedbackRepository: Repository<Feedback>
  let conferenceRepository: Repository<Conference>

  const mockSessionRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
    findOne: jest.fn(),
  }

  const mockAttendanceRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
  }

  const mockFeedbackRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
  }

  const mockConferenceRepository = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionAnalyticsService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepository,
        },
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockFeedbackRepository,
        },
        {
          provide: getRepositoryToken(Conference),
          useValue: mockConferenceRepository,
        },
      ],
    }).compile()

    service = module.get<SessionAnalyticsService>(SessionAnalyticsService)
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session))
    attendanceRepository = module.get<Repository<Attendance>>(getRepositoryToken(Attendance))
    feedbackRepository = module.get<Repository<Feedback>>(getRepositoryToken(Feedback))
    conferenceRepository = module.get<Repository<Conference>>(getRepositoryToken(Conference))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getSessionAnalyticsDashboard", () => {
    const mockFilters: SessionAnalyticsFilterDto = {
      timeFilter: "week",
      conferenceId: "conf-123",
    }

    const mockSessionData = [
      {
        sessionId: "session-1",
        sessionTitle: "Test Session 1",
        speakerName: "John Doe",
        track: "Technology",
        scheduledStartTime: "2024-01-15T10:00:00Z",
        scheduledEndTime: "2024-01-15T11:00:00Z",
        actualStartTime: "2024-01-15T10:00:00Z",
        actualEndTime: "2024-01-15T11:00:00Z",
        capacity: 100,
        attendanceCount: "50",
        averageRating: "4.5",
        feedbackCount: "25",
      },
    ]

    const mockDailyAttendance = [
      {
        date: "2024-01-15",
        totalSessions: "5",
        totalAttendance: "250",
        averageAttendancePerSession: "50.00",
      },
    ]

    const mockSpeakerAnalytics = [
      {
        speakerName: "John Doe",
        totalSessions: "3",
        totalAttendance: "150",
        averageRating: "4.5",
        totalFeedback: "75",
        onTimeSessions: "3",
        totalSessionsWithTime: "3",
      },
    ]

    const mockTrackAnalytics = [
      {
        track: "Technology",
        totalSessions: "5",
        totalAttendance: "250",
        averageRating: "4.3",
        onTimeSessions: "4",
        totalSessionsWithTime: "5",
      },
    ]

    const mockSessionOverlaps = [
      {
        timeSlot: "2024-01-15 10:00:00 - 11:00:00",
        overlappingSessions: "2",
        totalAttendance: "100",
        averageAttendancePerSession: "50.00",
        sessionTitles: "Session 1, Session 2",
      },
    ]

    const mockSummary = {
      totalSessions: "10",
      totalAttendance: "500",
      averageAttendance: "50.00",
      averageRating: "4.2",
      punctualityScore: "80.00",
    }

    const mockConference = {
      id: "conf-123",
      name: "Test Conference",
    }

    it("should return session analytics dashboard data", async () => {
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany
        .mockResolvedValueOnce(mockSessionData) // sessionAttendance
        .mockResolvedValueOnce(mockDailyAttendance) // dailyAttendance
        .mockResolvedValueOnce(mockSpeakerAnalytics) // speakerAnalytics
        .mockResolvedValueOnce(mockTrackAnalytics) // trackAnalytics
        .mockResolvedValueOnce(mockSessionOverlaps) // sessionOverlaps
        .mockResolvedValueOnce(mockSummary) // summary

      mockConferenceRepository.findOne.mockResolvedValue(mockConference)

      const result = await service.getSessionAnalyticsDashboard("organizer-123", mockFilters)

      expect(result).toBeDefined()
      expect(result.conferenceId).toBe("conf-123")
      expect(result.conferenceName).toBe("Test Conference")
      expect(result.totalSessions).toBe(10)
      expect(result.totalAttendance).toBe(500)
      expect(result.averageAttendance).toBe(50)
      expect(result.averageRating).toBe(4.2)
      expect(result.overallPunctualityScore).toBe(80)
      expect(result.topSessions).toHaveLength(1)
      expect(result.leastAttendedSessions).toHaveLength(1)
      expect(result.dailyAttendance).toHaveLength(1)
      expect(result.speakerAnalytics).toHaveLength(1)
      expect(result.trackAnalytics).toHaveLength(1)
      expect(result.sessionOverlaps).toHaveLength(1)
    })

    it("should handle empty data gracefully", async () => {
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany
        .mockResolvedValueOnce([]) // sessionAttendance
        .mockResolvedValueOnce([]) // dailyAttendance
        .mockResolvedValueOnce([]) // speakerAnalytics
        .mockResolvedValueOnce([]) // trackAnalytics
        .mockResolvedValueOnce([]) // sessionOverlaps
        .mockResolvedValueOnce({
          totalSessions: "0",
          totalAttendance: "0",
          averageAttendance: "0.00",
          averageRating: "0.00",
          punctualityScore: "0.00",
        }) // summary

      mockConferenceRepository.findOne.mockResolvedValue(null)

      const result = await service.getSessionAnalyticsDashboard("organizer-123", mockFilters)

      expect(result).toBeDefined()
      expect(result.conferenceId).toBe("")
      expect(result.conferenceName).toBe("All Conferences")
      expect(result.totalSessions).toBe(0)
      expect(result.totalAttendance).toBe(0)
      expect(result.averageAttendance).toBe(0)
      expect(result.averageRating).toBe(0)
      expect(result.overallPunctualityScore).toBe(0)
      expect(result.topSessions).toHaveLength(0)
      expect(result.leastAttendedSessions).toHaveLength(0)
    })

    it("should apply filters correctly", async () => {
      const filtersWithAllOptions: SessionAnalyticsFilterDto = {
        timeFilter: "month",
        conferenceId: "conf-123",
        track: "Technology",
        speaker: "John Doe",
        date: "2024-01-15",
      }

      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({
          totalSessions: "0",
          totalAttendance: "0",
          averageAttendance: "0.00",
          averageRating: "0.00",
          punctualityScore: "0.00",
        })

      mockConferenceRepository.findOne.mockResolvedValue(null)

      await service.getSessionAnalyticsDashboard("organizer-123", filtersWithAllOptions)

      // Verify that andWhere was called for each filter
      expect(queryBuilder.andWhere).toHaveBeenCalledWith("session.conferenceId = :conferenceId", {
        conferenceId: "conf-123",
      })
      expect(queryBuilder.andWhere).toHaveBeenCalledWith("session.track = :track", {
        track: "Technology",
      })
      expect(queryBuilder.andWhere).toHaveBeenCalledWith("session.speakerName = :speaker", {
        speaker: "John Doe",
      })
    })
  })

  describe("getSessionAnalyticsSummary", () => {
    const mockFilters: SessionAnalyticsFilterDto = {
      timeFilter: "week",
    }

    const mockSummary = {
      totalSessions: "10",
      totalAttendance: "500",
      averageAttendance: "50.00",
      averageRating: "4.2",
      punctualityScore: "80.00",
    }

    const mockMostAttendedSession = {
      title: "Most Popular Session",
      speaker: "John Doe",
      attendance: "100",
    }

    const mockLeastAttendedSession = {
      title: "Least Popular Session",
      speaker: "Jane Smith",
      attendance: "10",
    }

    const mockTopRatedSession = {
      title: "Top Rated Session",
      speaker: "Bob Johnson",
      rating: "4.8",
    }

    const mockMostPunctualSpeaker = {
      name: "Alice Brown",
      onTimeSessions: "5",
      totalSessions: "5",
    }

    it("should return session analytics summary", async () => {
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawOne
        .mockResolvedValueOnce(mockSummary) // summary
        .mockResolvedValueOnce(mockMostAttendedSession) // mostAttendedSession
        .mockResolvedValueOnce(mockLeastAttendedSession) // leastAttendedSession
        .mockResolvedValueOnce(mockTopRatedSession) // topRatedSession
        .mockResolvedValueOnce(mockMostPunctualSpeaker) // mostPunctualSpeaker

      const result = await service.getSessionAnalyticsSummary("organizer-123", mockFilters)

      expect(result).toBeDefined()
      expect(result.totalSessions).toBe(10)
      expect(result.totalAttendance).toBe(500)
      expect(result.averageAttendance).toBe(50)
      expect(result.averageRating).toBe(4.2)
      expect(result.punctualityScore).toBe(80)
      expect(result.mostAttendedSession.title).toBe("Most Popular Session")
      expect(result.leastAttendedSession.title).toBe("Least Popular Session")
      expect(result.topRatedSession.title).toBe("Top Rated Session")
      expect(result.mostPunctualSpeaker.name).toBe("Alice Brown")
    })

    it("should handle missing data gracefully", async () => {
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawOne
        .mockResolvedValueOnce({
          totalSessions: "0",
          totalAttendance: "0",
          averageAttendance: "0.00",
          averageRating: "0.00",
          punctualityScore: "0.00",
        })
        .mockResolvedValueOnce(null) // mostAttendedSession
        .mockResolvedValueOnce(null) // leastAttendedSession
        .mockResolvedValueOnce(null) // topRatedSession
        .mockResolvedValueOnce(null) // mostPunctualSpeaker

      const result = await service.getSessionAnalyticsSummary("organizer-123", mockFilters)

      expect(result).toBeDefined()
      expect(result.totalSessions).toBe(0)
      expect(result.totalAttendance).toBe(0)
      expect(result.averageAttendance).toBe(0)
      expect(result.averageRating).toBe(0)
      expect(result.punctualityScore).toBe(0)
      expect(result.mostAttendedSession.title).toBe("N/A")
      expect(result.leastAttendedSession.title).toBe("N/A")
      expect(result.topRatedSession.title).toBe("N/A")
      expect(result.mostPunctualSpeaker.name).toBe("N/A")
    })
  })

  describe("date range calculation", () => {
    it("should calculate correct date range for today", async () => {
      const filters: SessionAnalyticsFilterDto = { timeFilter: "today" }
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany.mockResolvedValue([])
      queryBuilder.getRawOne.mockResolvedValue({
        totalSessions: "0",
        totalAttendance: "0",
        averageAttendance: "0.00",
        averageRating: "0.00",
        punctualityScore: "0.00",
      })

      mockConferenceRepository.findOne.mockResolvedValue(null)

      await service.getSessionAnalyticsDashboard("organizer-123", filters)

      // Verify that the date range is applied correctly
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "session.scheduledStartTime BETWEEN :startDate AND :endDate",
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      )
    })

    it("should calculate correct date range for specific date", async () => {
      const filters: SessionAnalyticsFilterDto = { date: "2024-01-15" }
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany.mockResolvedValue([])
      queryBuilder.getRawOne.mockResolvedValue({
        totalSessions: "0",
        totalAttendance: "0",
        averageAttendance: "0.00",
        averageRating: "0.00",
        punctualityScore: "0.00",
      })

      mockConferenceRepository.findOne.mockResolvedValue(null)

      await service.getSessionAnalyticsDashboard("organizer-123", filters)

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "session.scheduledStartTime BETWEEN :startDate AND :endDate",
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      )
    })
  })

  describe("error handling", () => {
    it("should handle repository errors gracefully", async () => {
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany.mockRejectedValue(new Error("Database error"))

      await expect(
        service.getSessionAnalyticsDashboard("organizer-123", {}),
      ).rejects.toThrow("Database error")
    })

    it("should handle missing conference gracefully", async () => {
      const filters: SessionAnalyticsFilterDto = { conferenceId: "non-existent" }
      const queryBuilder = sessionRepository.createQueryBuilder()
      queryBuilder.getRawMany.mockResolvedValue([])
      queryBuilder.getRawOne.mockResolvedValue({
        totalSessions: "0",
        totalAttendance: "0",
        averageAttendance: "0.00",
        averageRating: "0.00",
        punctualityScore: "0.00",
      })

      mockConferenceRepository.findOne.mockResolvedValue(null)

      const result = await service.getSessionAnalyticsDashboard("organizer-123", filters)

      expect(result.conferenceId).toBe("")
      expect(result.conferenceName).toBe("All Conferences")
    })
  })
}) 