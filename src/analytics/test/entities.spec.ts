import { Conference } from "../entities/conference.entity"
import { Session } from "../entities/session.entity"
import { Attendance } from "../entities/attendance.entity"
import { Feedback } from "../entities/feedback.entity"

describe("Entities", () => {
  describe("Conference", () => {
    it("should create a conference instance", () => {
      const conference = new Conference()
      conference.name = "Test Conference"
      conference.description = "Test Description"
      conference.startDate = new Date("2024-03-15")
      conference.endDate = new Date("2024-03-17")
      conference.location = "Test Location"
      conference.organizerId = "organizer-1"

      expect(conference.name).toBe("Test Conference")
      expect(conference.description).toBe("Test Description")
      expect(conference.startDate).toEqual(new Date("2024-03-15"))
      expect(conference.endDate).toEqual(new Date("2024-03-17"))
      expect(conference.location).toBe("Test Location")
      expect(conference.organizerId).toBe("organizer-1")
    })
  })

  describe("Session", () => {
    it("should create a session instance", () => {
      const session = new Session()
      session.title = "Test Session"
      session.description = "Test Description"
      session.speakerName = "John Doe"
      session.track = "Tech"
      session.scheduledStartTime = new Date("2024-03-15T09:00:00")
      session.scheduledEndTime = new Date("2024-03-15T10:00:00")
      session.actualStartTime = new Date("2024-03-15T09:05:00")
      session.actualEndTime = new Date("2024-03-15T10:05:00")
      session.capacity = 100
      session.conferenceId = "conference-1"

      expect(session.title).toBe("Test Session")
      expect(session.description).toBe("Test Description")
      expect(session.speakerName).toBe("John Doe")
      expect(session.track).toBe("Tech")
      expect(session.scheduledStartTime).toEqual(new Date("2024-03-15T09:00:00"))
      expect(session.scheduledEndTime).toEqual(new Date("2024-03-15T10:00:00"))
      expect(session.actualStartTime).toEqual(new Date("2024-03-15T09:05:00"))
      expect(session.actualEndTime).toEqual(new Date("2024-03-15T10:05:00"))
      expect(session.capacity).toBe(100)
      expect(session.conferenceId).toBe("conference-1")
    })
  })

  describe("Attendance", () => {
    it("should create an attendance instance", () => {
      const attendance = new Attendance()
      attendance.sessionId = "session-1"
      attendance.attendeeId = "attendee-1"
      attendance.attendeeName = "John Smith"
      attendance.attendeeEmail = "john@example.com"
      attendance.checkedInAt = new Date("2024-03-15T08:55:00")
      attendance.checkedOutAt = new Date("2024-03-15T10:05:00")

      expect(attendance.sessionId).toBe("session-1")
      expect(attendance.attendeeId).toBe("attendee-1")
      expect(attendance.attendeeName).toBe("John Smith")
      expect(attendance.attendeeEmail).toBe("john@example.com")
      expect(attendance.checkedInAt).toEqual(new Date("2024-03-15T08:55:00"))
      expect(attendance.checkedOutAt).toEqual(new Date("2024-03-15T10:05:00"))
    })
  })

  describe("Feedback", () => {
    it("should create a feedback instance", () => {
      const feedback = new Feedback()
      feedback.sessionId = "session-1"
      feedback.attendeeId = "attendee-1"
      feedback.rating = 5
      feedback.comment = "Excellent session!"

      expect(feedback.sessionId).toBe("session-1")
      expect(feedback.attendeeId).toBe("attendee-1")
      expect(feedback.rating).toBe(5)
      expect(feedback.comment).toBe("Excellent session!")
    })

    it("should validate rating range", () => {
      const feedback = new Feedback()
      feedback.rating = 3

      expect(feedback.rating).toBeGreaterThanOrEqual(1)
      expect(feedback.rating).toBeLessThanOrEqual(5)
    })
  })
})
