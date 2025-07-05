import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AnalyticsService } from "../services/analytics.service"
import { Conference } from "../entities/conference.entity"
import { Session } from "../entities/session.entity"
import { Attendance } from "../entities/attendance.entity"
import { Feedback } from "../entities/feedback.entity"
import type { AnalyticsFilterDto } from "../dto/analytics-filter.dto"
import { jest } from "@jest/globals" // Import jest to declare it

describe("AnalyticsService", () => {
  let service: AnalyticsService
  let conferenceRepository: Repository<Conference>
  let sessionRepository: Repository<Session>
  let attendanceRepository: Repository<Attendance>
  let feedbackRepository: Repository<Feedback>

  const mockConferenceRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockSessionRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockAttendanceRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockFeedbackRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Conference),
          useValue: mockConferenceRepository,
        },
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
      ],
    }).compile()

    service = module.get<AnalyticsService>(AnalyticsService)
    conferenceRepository = module.get<Repository<Conference>>(getRepositoryToken(Conference))
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session))
    attendanceRepository = module.get<Repository<Attendance>>(getRepositoryToken(Attendance))
    feedbackRepository = module.get<Repository<Feedback>>(getRepositoryToken(Feedback))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("getDashboardData", () => {
    it("should return dashboard data with all analytics", async () => {
      const organizerId = "test-organizer-id"
      const filters: AnalyticsFilterDto = {}

      // Mock query builder responses
      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockFeedbackRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockConferenceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      // Mock attendance per day data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          date: "2024-03-15",
          totalAttendees: "10",
          totalSessions: "3",
        },
      ])

      // Mock session popularity data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          sessionId: "session-1",
          sessionTitle: "Test Session",
          speakerName: "John Doe",
          track: "Tech",
          capacity: "100",
          scheduledStartTime: new Date("2024-03-15T09:00:00"),
          attendeeCount: "50",
        },
      ])

      // Mock speaker punctuality data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          speakerName: "John Doe",
          totalSessions: "2",
          onTimeSessions: "1",
          lateSessions: "1",
          averageDelayMinutes: "5.0",
        },
      ])

      // Mock session overlaps data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          timeSlot: "2024-03-15 09:00:00 - 10:00:00",
          overlappingSessions: "2",
          totalAttendees: "80",
        },
      ])

      // Mock feedback stats data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          sessionId: "session-1",
          sessionTitle: "Test Session",
          speakerName: "John Doe",
          averageRating: "4.5",
          totalFeedbacks: "10",
          rating1: "0",
          rating2: "1",
          rating3: "2",
          rating4: "3",
          rating5: "4",
        },
      ])

      // Mock summary stats
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ totalConferences: "2" })
        .mockResolvedValueOnce({ totalSessions: "5" })
        .mockResolvedValueOnce({ totalAttendees: "25" })
        .mockResolvedValueOnce({ averageFeedbackScore: "4.2" })
        .mockResolvedValueOnce({
          totalSessionsWithActualTime: "4",
          onTimeSessions: "3",
        })

      const result = await service.getDashboardData(organizerId, filters)

      expect(result).toBeDefined()
      expect(result.attendancePerDay).toHaveLength(1)
      expect(result.mostAttendedSessions).toHaveLength(1)
      expect(result.speakerPunctuality).toHaveLength(1)
      expect(result.sessionOverlaps).toHaveLength(1)
      expect(result.feedbackStats).toHaveLength(1)
      expect(result.summary).toBeDefined()
      expect(result.summary.totalConferences).toBe(2)
      expect(result.summary.totalSessions).toBe(5)
      expect(result.summary.totalAttendees).toBe(25)
    })

    it("should apply filters correctly", async () => {
      const organizerId = "test-organizer-id"
      const filters: AnalyticsFilterDto = {
        conferenceId: "conference-1",
        track: "Tech",
        speaker: "John Doe",
        startDate: "2024-03-15",
        endDate: "2024-03-17",
      }

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockFeedbackRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockConferenceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      // Mock empty responses for simplicity
      mockQueryBuilder.getRawMany.mockResolvedValue([])
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: "0" })

      await service.getDashboardData(organizerId, filters)

      // Verify that filters are applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("session.track = :track", { track: filters.track })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("session.speakerName = :speaker", {
        speaker: filters.speaker,
      })
    })
  })

  describe("getConferencesByOrganizer", () => {
    it("should return conferences for organizer", async () => {
      const organizerId = "test-organizer-id"
      const mockConferences = [
        {
          id: "conf-1",
          name: "Test Conference",
          organizerId,
          startDate: new Date("2024-03-15"),
        },
      ]

      mockConferenceRepository.find.mockResolvedValue(mockConferences)

      const result = await service.getConferencesByOrganizer(organizerId)

      expect(result).toEqual(mockConferences)
      expect(mockConferenceRepository.find).toHaveBeenCalledWith({
        where: { organizerId },
        order: { startDate: "DESC" },
      })
    })
  })

  describe("getTracksByConference", () => {
    it("should return unique tracks for conference", async () => {
      const conferenceId = "conference-1"
      const mockTracks = [{ track: "Tech" }, { track: "Business" }]

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getRawMany.mockResolvedValue(mockTracks)

      const result = await service.getTracksByConference(conferenceId)

      expect(result).toEqual(["Tech", "Business"])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("session.conferenceId = :conferenceId", { conferenceId })
    })
  })

  describe("getSpeakersByConference", () => {
    it("should return unique speakers for conference", async () => {
      const conferenceId = "conference-1"
      const mockSpeakers = [{ speakerName: "John Doe" }, { speakerName: "Jane Smith" }]

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getRawMany.mockResolvedValue(mockSpeakers)

      const result = await service.getSpeakersByConference(conferenceId)

      expect(result).toEqual(["John Doe", "Jane Smith"])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("session.conferenceId = :conferenceId", { conferenceId })
    })
  })
})
