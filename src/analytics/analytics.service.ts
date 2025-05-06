import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Attendance } from "./entities/attendance.entity"
import type { CreateAttendanceDto } from "./dto/create-attendance.dto"
import type { ConferenceService } from "../conference/conference.service"

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly conferenceService: ConferenceService,
  ) {}

  async recordAttendance(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    const attendance = this.attendanceRepository.create(createAttendanceDto)
    return this.attendanceRepository.save(attendance)
  }

  async getConferenceAttendance(conferenceId: string): Promise<any> {
    const conference = await this.conferenceService.findConferenceById(conferenceId)
    const sessionIds = conference.sessions.map((session) => session.id)

    const attendances = await this.attendanceRepository
      .createQueryBuilder("attendance")
      .where("attendance.sessionId IN (:...sessionIds)", { sessionIds })
      .getMany()

    const uniqueAttendees = new Set(attendances.map((a) => a.attendeeId))

    return {
      totalAttendees: uniqueAttendees.size,
      totalCheckins: attendances.length,
      sessionsCount: conference.sessions.length,
    }
  }

  async getSessionAttendance(sessionId: string): Promise<any> {
    const attendances = await this.attendanceRepository.find({
      where: { sessionId },
    })

    return {
      sessionId,
      attendeesCount: attendances.length,
    }
  }

  async getDailyAttendance(conferenceId: string): Promise<any[]> {
    const conference = await this.conferenceService.findConferenceById(conferenceId)

    const startDate = new Date(conference.startDate)
    const endDate = new Date(conference.endDate)
    const days = []

    for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
      const currentDate = new Date(day)
      const sessions = await this.conferenceService.getSessionsByDay(conferenceId, currentDate)
      const sessionIds = sessions.map((session) => session.id)

      if (sessionIds.length === 0) continue

      const attendances = await this.attendanceRepository
        .createQueryBuilder("attendance")
        .where("attendance.sessionId IN (:...sessionIds)", { sessionIds })
        .getMany()

      const uniqueAttendees = new Set(attendances.map((a) => a.attendeeId))

      days.push({
        date: currentDate.toISOString().split("T")[0],
        sessionsCount: sessions.length,
        attendeesCount: uniqueAttendees.size,
        checkinsCount: attendances.length,
      })
    }

    return days
  }

  async getPopularSessions(conferenceId: string, limit = 5): Promise<any[]> {
    const conference = await this.conferenceService.findConferenceById(conferenceId)
    const sessionIds = conference.sessions.map((session) => session.id)

    const sessionAttendance = await this.attendanceRepository
      .createQueryBuilder("attendance")
      .select("attendance.sessionId")
      .addSelect("COUNT(attendance.id)", "count")
      .where("attendance.sessionId IN (:...sessionIds)", { sessionIds })
      .groupBy("attendance.sessionId")
      .orderBy("count", "DESC")
      .limit(limit)
      .getRawMany()

    const result = []

    for (const item of sessionAttendance) {
      const session = await this.conferenceService.findSessionById(item.sessionId)
      result.push({
        sessionId: session.id,
        title: session.title,
        attendeesCount: Number.parseInt(item.count),
      })
    }

    return result
  }
}
