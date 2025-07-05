import { Injectable } from "@nestjs/common"
import { type Repository, Between } from "typeorm"
import type { Conference } from "../entities/conference.entity"
import type { Session } from "../entities/session.entity"
import type { Attendance } from "../entities/attendance.entity"
import type { Feedback } from "../entities/feedback.entity"
import type { AnalyticsFilterDto } from "../dto/analytics-filter.dto"
import type {
  DashboardResponseDto,
  AttendanceStatsDto,
  SessionPopularityDto,
  SpeakerPunctualityDto,
  SessionOverlapDto,
  FeedbackStatsDto,
} from "../dto/dashboard-response.dto"

@Injectable()
export class AnalyticsService {
  constructor(
    private conferenceRepository: Repository<Conference>,
    private sessionRepository: Repository<Session>,
    private attendanceRepository: Repository<Attendance>,
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async getDashboardData(organizerId: string, filters: AnalyticsFilterDto): Promise<DashboardResponseDto> {
    const whereConditions = await this.buildWhereConditions(organizerId, filters)

    const [attendancePerDay, sessionPopularity, speakerPunctuality, sessionOverlaps, feedbackStats, summary] =
      await Promise.all([
        this.getAttendancePerDay(whereConditions, filters),
        this.getSessionPopularity(whereConditions, filters),
        this.getSpeakerPunctuality(whereConditions, filters),
        this.getSessionOverlaps(whereConditions, filters),
        this.getFeedbackStats(whereConditions, filters),
        this.getSummaryStats(whereConditions, filters),
      ])

    return {
      attendancePerDay,
      mostAttendedSessions: sessionPopularity.slice(0, 10),
      leastAttendedSessions: sessionPopularity.slice(-10).reverse(),
      speakerPunctuality,
      sessionOverlaps,
      feedbackStats,
      summary,
    }
  }

  private async buildWhereConditions(organizerId: string, filters: AnalyticsFilterDto): Promise<any> {
    const conditions: any = {
      conference: { organizerId },
    }

    if (filters.conferenceId) {
      conditions.conferenceId = filters.conferenceId
    }

    if (filters.startDate && filters.endDate) {
      conditions.scheduledStartTime = Between(new Date(filters.startDate), new Date(filters.endDate))
    }

    if (filters.track) {
      conditions.track = filters.track
    }

    if (filters.speaker) {
      conditions.speakerName = filters.speaker
    }

    return conditions
  }

  private async getAttendancePerDay(whereConditions: any, filters: AnalyticsFilterDto): Promise<AttendanceStatsDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "DATE(session.scheduledStartTime) as date",
        "COUNT(DISTINCT attendance.id) as totalAttendees",
        "COUNT(DISTINCT session.id) as totalSessions",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .groupBy("DATE(session.scheduledStartTime)")
      .orderBy("date", "ASC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", {
        speaker: filters.speaker,
      })
    }

    const results = await query.getRawMany()

    return results.map((result) => ({
      date: result.date,
      totalAttendees: Number.parseInt(result.totalAttendees) || 0,
      totalSessions: Number.parseInt(result.totalSessions) || 0,
      averageAttendancePerSession:
        Number.parseInt(result.totalSessions) > 0
          ? Number.parseInt(result.totalAttendees) / Number.parseInt(result.totalSessions)
          : 0,
    }))
  }

  private async getSessionPopularity(
    whereConditions: any,
    filters: AnalyticsFilterDto,
  ): Promise<SessionPopularityDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "session.id as sessionId",
        "session.title as sessionTitle",
        "session.speakerName as speakerName",
        "session.track as track",
        "session.capacity as capacity",
        "session.scheduledStartTime as scheduledStartTime",
        "COUNT(attendance.id) as attendeeCount",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .groupBy("session.id")
      .orderBy("attendeeCount", "DESC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", {
        speaker: filters.speaker,
      })
    }

    const results = await query.getRawMany()

    return results.map((result) => ({
      sessionId: result.sessionId,
      sessionTitle: result.sessionTitle,
      speakerName: result.speakerName,
      track: result.track || "N/A",
      attendeeCount: Number.parseInt(result.attendeeCount) || 0,
      capacity: Number.parseInt(result.capacity) || 0,
      attendanceRate:
        Number.parseInt(result.capacity) > 0
          ? (Number.parseInt(result.attendeeCount) / Number.parseInt(result.capacity)) * 100
          : 0,
      scheduledStartTime: result.scheduledStartTime,
    }))
  }

  private async getSpeakerPunctuality(
    whereConditions: any,
    filters: AnalyticsFilterDto,
  ): Promise<SpeakerPunctualityDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .select([
        "session.speakerName as speakerName",
        "COUNT(session.id) as totalSessions",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
        "SUM(CASE WHEN session.actualStartTime > session.scheduledStartTime THEN 1 ELSE 0 END) as lateSessions",
        "AVG(CASE WHEN session.actualStartTime > session.scheduledStartTime THEN EXTRACT(EPOCH FROM (session.actualStartTime - session.scheduledStartTime))/60 ELSE 0 END) as averageDelayMinutes",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.actualStartTime IS NOT NULL")
      .groupBy("session.speakerName")
      .orderBy("speakerName", "ASC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", {
        speaker: filters.speaker,
      })
    }

    const results = await query.getRawMany()

    return results.map((result) => {
      const totalSessions = Number.parseInt(result.totalSessions) || 0
      const onTimeSessions = Number.parseInt(result.onTimeSessions) || 0

      return {
        speakerName: result.speakerName,
        totalSessions,
        onTimeSessions,
        lateSessions: Number.parseInt(result.lateSessions) || 0,
        averageDelayMinutes: Number.parseFloat(result.averageDelayMinutes) || 0,
        punctualityRate: totalSessions > 0 ? (onTimeSessions / totalSessions) * 100 : 0,
      }
    })
  }

  private async getSessionOverlaps(whereConditions: any, filters: AnalyticsFilterDto): Promise<SessionOverlapDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "CONCAT(DATE(session.scheduledStartTime), ' ', TIME(session.scheduledStartTime), ' - ', TIME(session.scheduledEndTime)) as timeSlot",
        "COUNT(DISTINCT session.id) as overlappingSessions",
        "COUNT(attendance.id) as totalAttendees",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .groupBy("DATE(session.scheduledStartTime), TIME(session.scheduledStartTime), TIME(session.scheduledEndTime)")
      .having("COUNT(DISTINCT session.id) > 1")
      .orderBy("DATE(session.scheduledStartTime)", "ASC")
      .addOrderBy("TIME(session.scheduledStartTime)", "ASC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    const results = await query.getRawMany()

    return results.map((result) => {
      const overlappingSessions = Number.parseInt(result.overlappingSessions) || 0
      const totalAttendees = Number.parseInt(result.totalAttendees) || 0

      return {
        timeSlot: result.timeSlot,
        overlappingSessions,
        totalAttendees,
        averageAttendeesPerSession: overlappingSessions > 0 ? totalAttendees / overlappingSessions : 0,
      }
    })
  }

  private async getFeedbackStats(whereConditions: any, filters: AnalyticsFilterDto): Promise<FeedbackStatsDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "session.id as sessionId",
        "session.title as sessionTitle",
        "session.speakerName as speakerName",
        "AVG(feedback.rating) as averageRating",
        "COUNT(feedback.id) as totalFeedbacks",
        "SUM(CASE WHEN feedback.rating = 1 THEN 1 ELSE 0 END) as rating1",
        "SUM(CASE WHEN feedback.rating = 2 THEN 1 ELSE 0 END) as rating2",
        "SUM(CASE WHEN feedback.rating = 3 THEN 1 ELSE 0 END) as rating3",
        "SUM(CASE WHEN feedback.rating = 4 THEN 1 ELSE 0 END) as rating4",
        "SUM(CASE WHEN feedback.rating = 5 THEN 1 ELSE 0 END) as rating5",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .groupBy("session.id")
      .having("COUNT(feedback.id) > 0")
      .orderBy("averageRating", "DESC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", {
        speaker: filters.speaker,
      })
    }

    const results = await query.getRawMany()

    return results.map((result) => ({
      sessionId: result.sessionId,
      sessionTitle: result.sessionTitle,
      speakerName: result.speakerName,
      averageRating: Number.parseFloat(result.averageRating) || 0,
      totalFeedbacks: Number.parseInt(result.totalFeedbacks) || 0,
      ratingDistribution: {
        rating1: Number.parseInt(result.rating1) || 0,
        rating2: Number.parseInt(result.rating2) || 0,
        rating3: Number.parseInt(result.rating3) || 0,
        rating4: Number.parseInt(result.rating4) || 0,
        rating5: Number.parseInt(result.rating5) || 0,
      },
    }))
  }

  private async getSummaryStats(whereConditions: any, filters: AnalyticsFilterDto): Promise<any> {
    const conferenceQuery = this.conferenceRepository
      .createQueryBuilder("conference")
      .select("COUNT(conference.id) as totalConferences")
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })

    const sessionQuery = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .select("COUNT(session.id) as totalSessions")
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })

    const attendanceQuery = this.attendanceRepository
      .createQueryBuilder("attendance")
      .leftJoin("attendance.session", "session")
      .leftJoin("session.conference", "conference")
      .select("COUNT(DISTINCT attendance.attendeeId) as totalAttendees")
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })

    const feedbackQuery = this.feedbackRepository
      .createQueryBuilder("feedback")
      .leftJoin("feedback.session", "session")
      .leftJoin("session.conference", "conference")
      .select("AVG(feedback.rating) as averageFeedbackScore")
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })

    const punctualityQuery = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .select([
        "COUNT(session.id) as totalSessionsWithActualTime",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.actualStartTime IS NOT NULL")

    if (filters.conferenceId) {
      sessionQuery.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
      attendanceQuery.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
      feedbackQuery.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
      punctualityQuery.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    const [conferenceResult, sessionResult, attendanceResult, feedbackResult, punctualityResult] = await Promise.all([
      conferenceQuery.getRawOne(),
      sessionQuery.getRawOne(),
      attendanceQuery.getRawOne(),
      feedbackQuery.getRawOne(),
      punctualityQuery.getRawOne(),
    ])

    const totalSessionsWithActualTime = Number.parseInt(punctualityResult.totalSessionsWithActualTime) || 0
    const onTimeSessions = Number.parseInt(punctualityResult.onTimeSessions) || 0

    return {
      totalConferences: Number.parseInt(conferenceResult.totalConferences) || 0,
      totalSessions: Number.parseInt(sessionResult.totalSessions) || 0,
      totalAttendees: Number.parseInt(attendanceResult.totalAttendees) || 0,
      averageFeedbackScore: Number.parseFloat(feedbackResult.averageFeedbackScore) || 0,
      overallPunctualityRate:
        totalSessionsWithActualTime > 0 ? (onTimeSessions / totalSessionsWithActualTime) * 100 : 0,
    }
  }

  async getConferencesByOrganizer(organizerId: string): Promise<Conference[]> {
    return this.conferenceRepository.find({
      where: { organizerId },
      order: { startDate: "DESC" },
    })
  }

  async getTracksByConference(conferenceId: string): Promise<string[]> {
    const tracks = await this.sessionRepository
      .createQueryBuilder("session")
      .select("DISTINCT session.track", "track")
      .where("session.conferenceId = :conferenceId", { conferenceId })
      .andWhere("session.track IS NOT NULL")
      .getRawMany()

    return tracks.map((t) => t.track)
  }

  async getSpeakersByConference(conferenceId: string): Promise<string[]> {
    const speakers = await this.sessionRepository
      .createQueryBuilder("session")
      .select("DISTINCT session.speakerName", "speakerName")
      .where("session.conferenceId = :conferenceId", { conferenceId })
      .orderBy("session.speakerName", "ASC")
      .getRawMany()

    return speakers.map((s) => s.speakerName)
  }
}
