import { Injectable } from "@nestjs/common"
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"
import { Session } from "../entities/session.entity"
import { Attendance } from "../entities/attendance.entity"
import { Feedback } from "../entities/feedback.entity"
import { Conference } from "../entities/conference.entity"
import {
  SessionAnalyticsFilterDto,
  SessionAnalyticsDashboardDto,
  SessionAttendanceDto,
  DailyAttendanceDto,
  SpeakerAnalyticsDto,
  TrackAnalyticsDto,
  SessionOverlapDto,
  SessionAnalyticsSummaryDto,
} from "../dto/session-analytics.dto"

@Injectable()
export class SessionAnalyticsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
  ) {}

  async getSessionAnalyticsDashboard(
    organizerId: string,
    filters: SessionAnalyticsFilterDto,
  ): Promise<SessionAnalyticsDashboardDto> {
    const { startDate, endDate } = this.getDateRange(filters)
    const whereConditions = this.buildWhereConditions(organizerId, filters)

    const [
      conference,
      sessionAttendance,
      dailyAttendance,
      speakerAnalytics,
      trackAnalytics,
      sessionOverlaps,
      summary,
    ] = await Promise.all([
      this.getConferenceInfo(filters.conferenceId),
      this.getSessionAttendance(whereConditions, filters, startDate, endDate),
      this.getDailyAttendance(whereConditions, filters, startDate, endDate),
      this.getSpeakerAnalytics(whereConditions, filters, startDate, endDate),
      this.getTrackAnalytics(whereConditions, filters, startDate, endDate),
      this.getSessionOverlaps(whereConditions, filters, startDate, endDate),
      this.getSummaryStats(whereConditions, filters, startDate, endDate),
    ])

    const topSessions = sessionAttendance
      .sort((a, b) => b.attendanceCount - a.attendanceCount)
      .slice(0, 10)

    const leastAttendedSessions = sessionAttendance
      .sort((a, b) => a.attendanceCount - b.attendanceCount)
      .slice(0, 10)

    return {
      conferenceId: conference?.id || "",
      conferenceName: conference?.name || "All Conferences",
      totalSessions: summary.totalSessions,
      totalAttendance: summary.totalAttendance,
      averageAttendance: summary.averageAttendance,
      averageRating: summary.averageRating,
      overallPunctualityScore: summary.punctualityScore,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      topSessions,
      leastAttendedSessions,
      dailyAttendance,
      speakerAnalytics,
      trackAnalytics,
      sessionOverlaps,
      filter: filters,
    }
  }

  async getSessionAnalyticsSummary(
    organizerId: string,
    filters: SessionAnalyticsFilterDto,
  ): Promise<SessionAnalyticsSummaryDto> {
    const { startDate, endDate } = this.getDateRange(filters)
    const whereConditions = this.buildWhereConditions(organizerId, filters)

    const [
      summary,
      mostAttendedSession,
      leastAttendedSession,
      topRatedSession,
      mostPunctualSpeaker,
    ] = await Promise.all([
      this.getSummaryStats(whereConditions, filters, startDate, endDate),
      this.getMostAttendedSession(whereConditions, filters, startDate, endDate),
      this.getLeastAttendedSession(whereConditions, filters, startDate, endDate),
      this.getTopRatedSession(whereConditions, filters, startDate, endDate),
      this.getMostPunctualSpeaker(whereConditions, filters, startDate, endDate),
    ])

    return {
      conferenceId: filters.conferenceId || "",
      totalSessions: summary.totalSessions,
      totalAttendance: summary.totalAttendance,
      averageAttendance: summary.averageAttendance,
      averageRating: summary.averageRating,
      punctualityScore: summary.punctualityScore,
      mostAttendedSession,
      leastAttendedSession,
      topRatedSession,
      mostPunctualSpeaker,
    }
  }

  private getDateRange(filters: SessionAnalyticsFilterDto): { startDate: Date; endDate: Date } {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (filters.date) {
      const selectedDate = new Date(filters.date)
      startDate = new Date(selectedDate.setHours(0, 0, 0, 0))
      endDate = new Date(selectedDate.setHours(23, 59, 59, 999))
    } else {
      switch (filters.timeFilter) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          endDate = new Date(now.setHours(23, 59, 59, 999))
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          endDate = now
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = now
          break
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          endDate = now
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = now
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          endDate = now
      }
    }

    return { startDate, endDate }
  }

  private buildWhereConditions(organizerId: string, filters: SessionAnalyticsFilterDto) {
    return {
      conference: { organizerId },
      ...(filters.conferenceId && { conferenceId: filters.conferenceId }),
      ...(filters.track && { track: filters.track }),
      ...(filters.speaker && { speakerName: filters.speaker }),
    }
  }

  private async getConferenceInfo(conferenceId?: string) {
    if (!conferenceId) return null
    return this.conferenceRepository.findOne({ where: { id: conferenceId } })
  }

  private async getSessionAttendance(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionAttendanceDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "session.id as sessionId",
        "session.title as sessionTitle",
        "session.speakerName as speakerName",
        "session.track as track",
        "session.scheduledStartTime as scheduledStartTime",
        "session.scheduledEndTime as scheduledEndTime",
        "session.actualStartTime as actualStartTime",
        "session.actualEndTime as actualEndTime",
        "session.capacity as capacity",
        "COUNT(DISTINCT attendance.id) as attendanceCount",
        "AVG(feedback.rating) as averageRating",
        "COUNT(DISTINCT feedback.id) as feedbackCount",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("session.id")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", { speaker: filters.speaker })
    }

    const results = await query.getRawMany()

    return results.map((result) => {
      const attendanceCount = Number.parseInt(result.attendanceCount) || 0
      const capacity = Number.parseInt(result.capacity) || 0
      const attendancePercentage = capacity > 0 ? (attendanceCount / capacity) * 100 : 0
      const averageRating = Number.parseFloat(result.averageRating) || 0
      const feedbackCount = Number.parseInt(result.feedbackCount) || 0

      // Calculate punctuality score
      let punctualityScore = 0
      if (result.actualStartTime && result.scheduledStartTime) {
        const actualStart = new Date(result.actualStartTime)
        const scheduledStart = new Date(result.scheduledStartTime)
        punctualityScore = actualStart <= scheduledStart ? 100 : 0
      }

      // Calculate duration in minutes
      const scheduledStart = new Date(result.scheduledStartTime)
      const scheduledEnd = new Date(result.scheduledEndTime)
      const duration = (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60)

      return {
        sessionId: result.sessionId,
        sessionTitle: result.sessionTitle,
        speakerName: result.speakerName,
        track: result.track || "N/A",
        scheduledStartTime: result.scheduledStartTime,
        scheduledEndTime: result.scheduledEndTime,
        actualStartTime: result.actualStartTime,
        actualEndTime: result.actualEndTime,
        capacity,
        attendanceCount,
        attendancePercentage,
        averageRating,
        feedbackCount,
        punctualityScore,
        duration,
      }
    })
  }

  private async getDailyAttendance(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAttendanceDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "DATE(session.scheduledStartTime) as date",
        "COUNT(DISTINCT session.id) as totalSessions",
        "COUNT(DISTINCT attendance.id) as totalAttendance",
        "AVG(attendance.id) as averageAttendancePerSession",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
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
      query.andWhere("session.speakerName = :speaker", { speaker: filters.speaker })
    }

    const results = await query.getRawMany()

    return results.map((result) => ({
      date: result.date,
      totalSessions: Number.parseInt(result.totalSessions) || 0,
      totalAttendance: Number.parseInt(result.totalAttendance) || 0,
      averageAttendancePerSession:
        Number.parseInt(result.totalSessions) > 0
          ? Number.parseInt(result.totalAttendance) / Number.parseInt(result.totalSessions)
          : 0,
    }))
  }

  private async getSpeakerAnalytics(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SpeakerAnalyticsDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "session.speakerName as speakerName",
        "COUNT(DISTINCT session.id) as totalSessions",
        "COUNT(DISTINCT attendance.id) as totalAttendance",
        "AVG(feedback.rating) as averageRating",
        "COUNT(DISTINCT feedback.id) as totalFeedback",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
        "COUNT(session.id) as totalSessionsWithTime",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("session.speakerName")
      .orderBy("totalAttendance", "DESC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", { speaker: filters.speaker })
    }

    const results = await query.getRawMany()

    return results.map((result) => {
      const totalSessions = Number.parseInt(result.totalSessions) || 0
      const totalAttendance = Number.parseInt(result.totalAttendance) || 0
      const averageAttendance = totalSessions > 0 ? totalAttendance / totalSessions : 0
      const averageRating = Number.parseFloat(result.averageRating) || 0
      const totalFeedback = Number.parseInt(result.totalFeedback) || 0
      const onTimeSessions = Number.parseInt(result.onTimeSessions) || 0
      const totalSessionsWithTime = Number.parseInt(result.totalSessionsWithTime) || 0
      const punctualityScore = totalSessionsWithTime > 0 ? (onTimeSessions / totalSessionsWithTime) * 100 : 0

      return {
        speakerName: result.speakerName,
        totalSessions,
        totalAttendance,
        averageAttendance,
        averageRating,
        punctualityScore,
        totalFeedback,
      }
    })
  }

  private async getTrackAnalytics(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ): Promise<TrackAnalyticsDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "session.track as track",
        "COUNT(DISTINCT session.id) as totalSessions",
        "COUNT(DISTINCT attendance.id) as totalAttendance",
        "AVG(feedback.rating) as averageRating",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
        "COUNT(session.id) as totalSessionsWithTime",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("session.track IS NOT NULL")
      .groupBy("session.track")
      .orderBy("totalAttendance", "DESC")

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      query.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      query.andWhere("session.speakerName = :speaker", { speaker: filters.speaker })
    }

    const results = await query.getRawMany()

    return results.map((result) => {
      const totalSessions = Number.parseInt(result.totalSessions) || 0
      const totalAttendance = Number.parseInt(result.totalAttendance) || 0
      const averageAttendance = totalSessions > 0 ? totalAttendance / totalSessions : 0
      const averageRating = Number.parseFloat(result.averageRating) || 0
      const onTimeSessions = Number.parseInt(result.onTimeSessions) || 0
      const totalSessionsWithTime = Number.parseInt(result.totalSessionsWithTime) || 0
      const punctualityScore = totalSessionsWithTime > 0 ? (onTimeSessions / totalSessionsWithTime) * 100 : 0

      return {
        track: result.track,
        totalSessions,
        totalAttendance,
        averageAttendance,
        averageRating,
        punctualityScore,
      }
    })
  }

  private async getSessionOverlaps(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionOverlapDto[]> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "CONCAT(DATE(session.scheduledStartTime), ' ', TIME(session.scheduledStartTime), ' - ', TIME(session.scheduledEndTime)) as timeSlot",
        "COUNT(DISTINCT session.id) as overlappingSessions",
        "COUNT(DISTINCT attendance.id) as totalAttendance",
        "GROUP_CONCAT(session.title SEPARATOR ', ') as sessionTitles",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
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
      const totalAttendance = Number.parseInt(result.totalAttendance) || 0
      const averageAttendancePerSession = overlappingSessions > 0 ? totalAttendance / overlappingSessions : 0

      return {
        timeSlot: result.timeSlot,
        overlappingSessions,
        totalAttendance,
        averageAttendancePerSession,
        sessions: result.sessionTitles ? result.sessionTitles.split(", ") : [],
      }
    })
  }

  private async getSummaryStats(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ) {
    const sessionQuery = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "COUNT(DISTINCT session.id) as totalSessions",
        "COUNT(DISTINCT attendance.id) as totalAttendance",
        "AVG(feedback.rating) as averageRating",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
        "COUNT(session.id) as totalSessionsWithTime",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })

    if (filters.conferenceId) {
      sessionQuery.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    if (filters.track) {
      sessionQuery.andWhere("session.track = :track", { track: filters.track })
    }

    if (filters.speaker) {
      sessionQuery.andWhere("session.speakerName = :speaker", { speaker: filters.speaker })
    }

    const result = await sessionQuery.getRawOne()

    const totalSessions = Number.parseInt(result.totalSessions) || 0
    const totalAttendance = Number.parseInt(result.totalAttendance) || 0
    const averageAttendance = totalSessions > 0 ? totalAttendance / totalSessions : 0
    const averageRating = Number.parseFloat(result.averageRating) || 0
    const onTimeSessions = Number.parseInt(result.onTimeSessions) || 0
    const totalSessionsWithTime = Number.parseInt(result.totalSessionsWithTime) || 0
    const punctualityScore = totalSessionsWithTime > 0 ? (onTimeSessions / totalSessionsWithTime) * 100 : 0

    return {
      totalSessions,
      totalAttendance,
      averageAttendance,
      averageRating,
      punctualityScore,
    }
  }

  private async getMostAttendedSession(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ) {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "session.title as title",
        "session.speakerName as speaker",
        "COUNT(DISTINCT attendance.id) as attendance",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("session.id")
      .orderBy("attendance", "DESC")
      .limit(1)

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    const result = await query.getRawOne()

    return {
      title: result?.title || "N/A",
      attendance: Number.parseInt(result?.attendance) || 0,
      speaker: result?.speaker || "N/A",
    }
  }

  private async getLeastAttendedSession(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ) {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.attendances", "attendance")
      .select([
        "session.title as title",
        "session.speakerName as speaker",
        "COUNT(DISTINCT attendance.id) as attendance",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("session.id")
      .orderBy("attendance", "ASC")
      .limit(1)

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    const result = await query.getRawOne()

    return {
      title: result?.title || "N/A",
      attendance: Number.parseInt(result?.attendance) || 0,
      speaker: result?.speaker || "N/A",
    }
  }

  private async getTopRatedSession(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ) {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .leftJoin("session.feedbacks", "feedback")
      .select([
        "session.title as title",
        "session.speakerName as speaker",
        "AVG(feedback.rating) as rating",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("session.id")
      .having("COUNT(feedback.id) > 0")
      .orderBy("rating", "DESC")
      .limit(1)

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    const result = await query.getRawOne()

    return {
      title: result?.title || "N/A",
      rating: Number.parseFloat(result?.rating) || 0,
      speaker: result?.speaker || "N/A",
    }
  }

  private async getMostPunctualSpeaker(
    whereConditions: any,
    filters: SessionAnalyticsFilterDto,
    startDate: Date,
    endDate: Date,
  ) {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoin("session.conference", "conference")
      .select([
        "session.speakerName as name",
        "SUM(CASE WHEN session.actualStartTime <= session.scheduledStartTime THEN 1 ELSE 0 END) as onTimeSessions",
        "COUNT(session.id) as totalSessions",
      ])
      .where("conference.organizerId = :organizerId", {
        organizerId: whereConditions.conference.organizerId,
      })
      .andWhere("session.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("session.actualStartTime IS NOT NULL")
      .groupBy("session.speakerName")
      .having("COUNT(session.id) >= 2")
      .orderBy("onTimeSessions", "DESC")
      .addOrderBy("totalSessions", "ASC")
      .limit(1)

    if (filters.conferenceId) {
      query.andWhere("session.conferenceId = :conferenceId", {
        conferenceId: filters.conferenceId,
      })
    }

    const result = await query.getRawOne()

    if (!result) {
      return { name: "N/A", score: 0 }
    }

    const onTimeSessions = Number.parseInt(result.onTimeSessions) || 0
    const totalSessions = Number.parseInt(result.totalSessions) || 0
    const score = totalSessions > 0 ? (onTimeSessions / totalSessions) * 100 : 0

    return {
      name: result.name,
      score,
    }
  }
} 