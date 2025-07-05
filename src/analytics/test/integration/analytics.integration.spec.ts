import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AnalyticsModule } from "../../analytics.module"
import { AnalyticsService } from "../../services/analytics.service"
import { Conference } from "../../entities/conference.entity"
import { Session } from "../../entities/session.entity"
import { Attendance } from "../../entities/attendance.entity"
import { Feedback } from "../../entities/feedback.entity"

describe("Analytics Integration Tests", () => {
  let module: TestingModule
  let analyticsService: AnalyticsService
  let conferenceRepository: Repository<Conference>
  let sessionRepository: Repository<Session>
  let attendanceRepository: Repository<Attendance>
  let feedbackRepository: Repository<Feedback>

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Conference, Session, Attendance, Feedback],
          synchronize: true,
        }),
        AnalyticsModule,
      ],
    }).compile()

    analyticsService = module.get<AnalyticsService>(AnalyticsService)
    conferenceRepository = module.get("ConferenceRepository")
    sessionRepository = module.get("SessionRepository")
    attendanceRepository = module.get("AttendanceRepository")
    feedbackRepository = module.get("FeedbackRepository")
  })

  afterAll(async () => {
    await module.close()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await feedbackRepository.clear()
    await attendanceRepository.clear()
    await sessionRepository.clear()
    await conferenceRepository.clear()
  })

  describe("getDashboardData", () => {
    it("should return comprehensive analytics data", async () => {
      const organizerId = "test-organizer-id"

      // Create test data
      const conference = await conferenceRepository.save({
        name: "Test Conference",
        description: "Test Description",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2024-03-17"),
        location: "Test Location",
        organizerId,
      })

      const session1 = await sessionRepository.save({
        title: "Session 1",
        description: "Description 1",
        speakerName: "Speaker 1",
        track: "Tech",
        scheduledStartTime: new Date("2024-03-15T09:00:00"),
        scheduledEndTime: new Date("2024-03-15T10:00:00"),
        actualStartTime: new Date("2024-03-15T09:05:00"),
        actualEndTime: new Date("2024-03-15T10:05:00"),
        capacity: 100,
        conferenceId: conference.id,
      })

      const session2 = await sessionRepository.save({
        title: "Session 2",
        description: "Description 2",
        speakerName: "Speaker 2",
        track: "Business",
        scheduledStartTime: new Date("2024-03-15T10:30:00"),
        scheduledEndTime: new Date("2024-03-15T11:30:00"),
        actualStartTime: new Date("2024-03-15T10:30:00"),
        actualEndTime: new Date("2024-03-15T11:30:00"),
        capacity: 80,
        conferenceId: conference.id,
      })

      // Create attendances
      await attendanceRepository.save([
        {
          sessionId: session1.id,
          attendeeId: "attendee-1",
          attendeeName: "Attendee 1",
          attendeeEmail: "attendee1@example.com",
          checkedInAt: new Date("2024-03-15T08:55:00"),
        },
        {
          sessionId: session1.id,
          attendeeId: "attendee-2",
          attendeeName: "Attendee 2",
          attendeeEmail: "attendee2@example.com",
          checkedInAt: new Date("2024-03-15T09:00:00"),
        },
        {
          sessionId: session2.id,
          attendeeId: "attendee-1",
          attendeeName: "Attendee 1",
          attendeeEmail: "attendee1@example.com",
          checkedInAt: new Date("2024-03-15T10:25:00"),
        },
      ])

      // Create feedbacks
      await feedbackRepository.save([
        {
          sessionId: session1.id,
          attendeeId: "attendee-1",
          rating: 5,
          comment: "Great session!",
        },
        {
          sessionId: session1.id,
          attendeeId: "attendee-2",
          rating: 4,
          comment: "Good session",
        },
        {
          sessionId: session2.id,
          attendeeId: "attendee-1",
          rating: 5,
          comment: "Excellent!",
        },
      ])

      const result = await analyticsService.getDashboardData(organizerId, {})

      expect(result).toBeDefined()
      expect(result.summary.totalConferences).toBe(1)
      expect(result.summary.totalSessions).toBe(2)
      expect(result.summary.totalAttendees).toBe(2) // Unique attendees
      expect(result.summary.averageFeedbackScore).toBeCloseTo(4.67, 1)
      expect(result.summary.overallPunctualityRate).toBe(50) // 1 out of 2 sessions on time

      expect(result.attendancePerDay).toHaveLength(1)
      expect(result.attendancePerDay[0].totalAttendees).toBe(3) // Total check-ins
      expect(result.attendancePerDay[0].totalSessions).toBe(2)

      expect(result.mostAttendedSessions).toHaveLength(2)
      expect(result.mostAttendedSessions[0].attendeeCount).toBe(2) // Session 1
      expect(result.mostAttendedSessions[1].attendeeCount).toBe(1) // Session 2

      expect(result.speakerPunctuality).toHaveLength(2)
      const speaker1Punctuality = result.speakerPunctuality.find((sp) => sp.speakerName === "Speaker 1")
      expect(speaker1Punctuality.punctualityRate).toBe(0) // Late
      const speaker2Punctuality = result.speakerPunctuality.find((sp) => sp.speakerName === "Speaker 2")
      expect(speaker2Punctuality.punctualityRate).toBe(100) // On time

      expect(result.feedbackStats).toHaveLength(2)
      const session1Feedback = result.feedbackStats.find((fs) => fs.sessionTitle === "Session 1")
      expect(session1Feedback.averageRating).toBe(4.5)
      expect(session1Feedback.totalFeedbacks).toBe(2)
    })

    it("should apply filters correctly", async () => {
      const organizerId = "test-organizer-id"

      // Create test data with multiple conferences and tracks
      const conference1 = await conferenceRepository.save({
        name: "Conference 1",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2024-03-17"),
        location: "Location 1",
        organizerId,
      })

      const conference2 = await conferenceRepository.save({
        name: "Conference 2",
        startDate: new Date("2024-04-15"),
        endDate: new Date("2024-04-17"),
        location: "Location 2",
        organizerId,
      })

      await sessionRepository.save([
        {
          title: "Tech Session",
          speakerName: "Tech Speaker",
          track: "Tech",
          scheduledStartTime: new Date("2024-03-15T09:00:00"),
          scheduledEndTime: new Date("2024-03-15T10:00:00"),
          capacity: 100,
          conferenceId: conference1.id,
        },
        {
          title: "Business Session",
          speakerName: "Business Speaker",
          track: "Business",
          scheduledStartTime: new Date("2024-03-15T10:00:00"),
          scheduledEndTime: new Date("2024-03-15T11:00:00"),
          capacity: 80,
          conferenceId: conference1.id,
        },
        {
          title: "Another Tech Session",
          speakerName: "Another Tech Speaker",
          track: "Tech",
          scheduledStartTime: new Date("2024-04-15T09:00:00"),
          scheduledEndTime: new Date("2024-04-15T10:00:00"),
          capacity: 90,
          conferenceId: conference2.id,
        },
      ])

      // Test conference filter
      const conferenceFilterResult = await analyticsService.getDashboardData(organizerId, {
        conferenceId: conference1.id,
      })
      expect(conferenceFilterResult.summary.totalSessions).toBe(2)

      // Test track filter
      const trackFilterResult = await analyticsService.getDashboardData(organizerId, { track: "Tech" })
      expect(trackFilterResult.summary.totalSessions).toBe(2)

      // Test speaker filter
      const speakerFilterResult = await analyticsService.getDashboardData(organizerId, { speaker: "Tech Speaker" })
      expect(speakerFilterResult.summary.totalSessions).toBe(1)
    })
  })

  describe("getConferencesByOrganizer", () => {
    it("should return conferences for specific organizer", async () => {
      const organizerId1 = "organizer-1"
      const organizerId2 = "organizer-2"

      await conferenceRepository.save([
        {
          name: "Conference 1",
          startDate: new Date("2024-03-15"),
          endDate: new Date("2024-03-17"),
          location: "Location 1",
          organizerId: organizerId1,
        },
        {
          name: "Conference 2",
          startDate: new Date("2024-04-15"),
          endDate: new Date("2024-04-17"),
          location: "Location 2",
          organizerId: organizerId1,
        },
        {
          name: "Conference 3",
          startDate: new Date("2024-05-15"),
          endDate: new Date("2024-05-17"),
          location: "Location 3",
          organizerId: organizerId2,
        },
      ])

      const result = await analyticsService.getConferencesByOrganizer(organizerId1)

      expect(result).toHaveLength(2)
      expect(result.every((conf) => conf.organizerId === organizerId1)).toBe(true)
      expect(result[0].startDate >= result[1].startDate).toBe(true) // Ordered by startDate DESC
    })
  })

  describe("getTracksByConference", () => {
    it("should return unique tracks for conference", async () => {
      const conference = await conferenceRepository.save({
        name: "Test Conference",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2024-03-17"),
        location: "Test Location",
        organizerId: "test-organizer",
      })

      await sessionRepository.save([
        {
          title: "Session 1",
          speakerName: "Speaker 1",
          track: "Tech",
          scheduledStartTime: new Date("2024-03-15T09:00:00"),
          scheduledEndTime: new Date("2024-03-15T10:00:00"),
          capacity: 100,
          conferenceId: conference.id,
        },
        {
          title: "Session 2",
          speakerName: "Speaker 2",
          track: "Business",
          scheduledStartTime: new Date("2024-03-15T10:00:00"),
          scheduledEndTime: new Date("2024-03-15T11:00:00"),
          capacity: 80,
          conferenceId: conference.id,
        },
        {
          title: "Session 3",
          speakerName: "Speaker 3",
          track: "Tech", // Duplicate track
          scheduledStartTime: new Date("2024-03-15T11:00:00"),
          scheduledEndTime: new Date("2024-03-15T12:00:00"),
          capacity: 90,
          conferenceId: conference.id,
        },
      ])

      const result = await analyticsService.getTracksByConference(conference.id)

      expect(result).toHaveLength(2)
      expect(result).toContain("Tech")
      expect(result).toContain("Business")
    })
  })

  describe("getSpeakersByConference", () => {
    it("should return unique speakers for conference", async () => {
      const conference = await conferenceRepository.save({
        name: "Test Conference",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2024-03-17"),
        location: "Test Location",
        organizerId: "test-organizer",
      })

      await sessionRepository.save([
        {
          title: "Session 1",
          speakerName: "Alice Johnson",
          track: "Tech",
          scheduledStartTime: new Date("2024-03-15T09:00:00"),
          scheduledEndTime: new Date("2024-03-15T10:00:00"),
          capacity: 100,
          conferenceId: conference.id,
        },
        {
          title: "Session 2",
          speakerName: "Bob Smith",
          track: "Business",
          scheduledStartTime: new Date("2024-03-15T10:00:00"),
          scheduledEndTime: new Date("2024-03-15T11:00:00"),
          capacity: 80,
          conferenceId: conference.id,
        },
        {
          title: "Session 3",
          speakerName: "Alice Johnson", // Duplicate speaker
          track: "Tech",
          scheduledStartTime: new Date("2024-03-15T11:00:00"),
          scheduledEndTime: new Date("2024-03-15T12:00:00"),
          capacity: 90,
          conferenceId: conference.id,
        },
      ])

      const result = await analyticsService.getSpeakersByConference(conference.id)

      expect(result).toHaveLength(2)
      expect(result).toContain("Alice Johnson")
      expect(result).toContain("Bob Smith")
      expect(result[0] <= result[1]).toBe(true) // Should be ordered alphabetically
    })
  })
})
