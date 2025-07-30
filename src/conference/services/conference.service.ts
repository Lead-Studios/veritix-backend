import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conference } from '../entities/conference.entity';
import { Session } from '../entities/session.entity';
import { Speaker } from '../entities/speaker.entity';
import { Track } from '../entities/track.entity';
import { AttendeeSession } from '../entities/attendee-session.entity';
import { SessionFeedback } from '../entities/session-feedback.entity';
import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class ConferenceService {
  constructor(
    @InjectRepository(Conference)
    private conferenceRepo: Repository<Conference>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Speaker) private speakerRepo: Repository<Speaker>,
    @InjectRepository(Track) private trackRepo: Repository<Track>,
    @InjectRepository(AttendeeSession)
    private attendeeSessionRepo: Repository<AttendeeSession>,
    @InjectRepository(SessionFeedback)
    private feedbackRepo: Repository<SessionFeedback>,
    @InjectRepository(Certificate)
    private certificateRepo: Repository<Certificate>,
  ) {}

  // Conference CRUD
  createConference(data: Partial<Conference>) {
    return this.conferenceRepo.save(data);
  }
  findAllConferences() {
    return this.conferenceRepo.find({ relations: ['sessions', 'tracks'] });
  }
  findConferenceById(id: number) {
    return this.conferenceRepo.findOne({
      where: { id },
      relations: ['sessions', 'tracks'],
    });
  }
  updateConference(id: number, data: Partial<Conference>) {
    return this.conferenceRepo.update(id, data);
  }

  // Session CRUD
  async createSession(data: Partial<Session>) {
    return this.sessionRepo.save(data);
  }
  async updateSession(id: number, data: Partial<Session>) {
    return this.sessionRepo.update(id, data);
  }
  async assignSpeakersToSession(sessionId: number, speakerIds: number[]) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['speakers'],
    });
    if (!session) throw new Error('Session not found');
    const speakers = await this.speakerRepo.findByIds(speakerIds);
    session.speakers = speakers;
    return this.sessionRepo.save(session);
  }

  // Speaker CRUD
  createSpeaker(data: Partial<Speaker>) {
    return this.speakerRepo.save(data);
  }

  // Track CRUD
  createTrack(data: Partial<Track>) {
    return this.trackRepo.save(data);
  }

  // Attendee session selection (My Agenda)
  async selectSession(attendeeId: string, sessionId: number) {
    // Only store attendee as a reference by id
    const attendee = { id: attendeeId } as any;
    const session = { id: sessionId } as any;
    return this.attendeeSessionRepo.save({ attendee, session });
  }
  async getMyAgenda(attendeeId: string) {
    return this.attendeeSessionRepo.find({
      where: { attendee: { id: attendeeId } },
      relations: ['session'],
    });
  }

  // Session feedback
  async submitSessionFeedback(
    attendeeId: string,
    dto: { sessionId: number; rating?: number; comment?: string },
  ) {
    const feedback = this.feedbackRepo.create({
      attendee: { id: attendeeId } as any,
      session: { id: dto.sessionId } as any,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.feedbackRepo.save(feedback);
  }

  // Certificate issuing
  async issueCertificate(
    conferenceId: number,
    attendeeId: string,
    fileUrl: string,
  ) {
    const cert = this.certificateRepo.create({
      conference: { id: conferenceId } as any,
      attendee: { id: attendeeId } as any,
      fileUrl,
    });
    return this.certificateRepo.save(cert);
  }

  // Analytics
  async getConferenceAnalytics(conferenceId: number) {
    // Example: session attendance, feedback average, ticket sales (stubbed)
    // In a real app, aggregate from DB
    return {
      totalSessions: 10,
      totalSpeakers: 20,
      totalAttendees: 200,
      sessionAttendance: [
        { sessionId: 1, attendees: 50 },
        { sessionId: 2, attendees: 30 },
      ],
      feedback: [
        { sessionId: 1, avgRating: 4.5 },
        { sessionId: 2, avgRating: 4.2 },
      ],
      ticketSales: {
        conference: 120,
        session: 80,
      },
    };
  }
}
