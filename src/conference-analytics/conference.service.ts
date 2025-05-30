import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository, Between } from "typeorm"
import { Conference } from "./entities/conference.entity"
import { Session } from "./entities/session.entity"
import type { CreateConferenceDto } from "./dto/create-conference.dto"
import type { CreateSessionDto } from "./dto/create-session.dto"
import type { UpdateConferenceDto } from "./dto/update-conference.dto"
import type { UpdateSessionDto } from "./dto/update-session.dto"

@Injectable()
export class ConferenceService {
  constructor(
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) { }

  async createConference(createConferenceDto: CreateConferenceDto): Promise<Conference> {
    const conference = this.conferenceRepository.create(createConferenceDto)
    return this.conferenceRepository.save(conference)
  }

  async findAllConferences(): Promise<Conference[]> {
    return this.conferenceRepository.find({
      relations: ["sessions"],
      order: { startDate: "ASC" },
    })
  }

  async findConferenceById(id: string): Promise<Conference> {
    const conference = await this.conferenceRepository.findOne({
      where: { id },
      relations: ["sessions"],
    })

    if (!conference) {
      throw new NotFoundException(`Conference with ID ${id} not found`)
    }

    return conference
  }

  async updateConference(id: string, updateConferenceDto: UpdateConferenceDto): Promise<Conference> {
    const conference = await this.findConferenceById(id)

    Object.assign(conference, updateConferenceDto)

    return this.conferenceRepository.save(conference)
  }

  async removeConference(id: string): Promise<void> {
    const conference = await this.findConferenceById(id)
    await this.conferenceRepository.remove(conference)
  }

  async createSession(createSessionDto: CreateSessionDto): Promise<Session> {
    const conference = await this.findConferenceById(createSessionDto.conferenceId)

    const session = this.sessionRepository.create(createSessionDto)
    session.conference = conference

    return this.sessionRepository.save(session)
  }

  async findSessionById(id: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ["conference"],
    })

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`)
    }

    return session
  }

  async updateSession(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.findSessionById(id)

    Object.assign(session, updateSessionDto)

    return this.sessionRepository.save(session)
  }

  async removeSession(id: string): Promise<void> {
    const session = await this.findSessionById(id)
    await this.sessionRepository.remove(session)
  }

  async getSessionsByDay(conferenceId: string, date: Date): Promise<Session[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return this.sessionRepository.find({
      where: {
        conferenceId,
        startTime: Between(startOfDay, endOfDay),
      },
      order: { startTime: "ASC" },
    })
  }
}
