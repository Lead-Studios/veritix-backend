import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conference } from './entities/conference.entity';
import { Session } from './entities/session.entity';
import { Speaker } from './entities/speaker.entity';
import { Track } from './entities/track.entity';
import { AttendeeSession } from './entities/attendee-session.entity';
import { SessionFeedback } from './entities/session-feedback.entity';
import { Certificate } from './entities/certificate.entity';
import { ConferenceService } from './services/conference.service';
import { ConferenceController } from './controllers/conference.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conference,
      Session,
      Speaker,
      Track,
      AttendeeSession,
      SessionFeedback,
      Certificate,
    ]),
  ],
  providers: [ConferenceService],
  controllers: [ConferenceController],
  exports: [ConferenceService],
})
export class ConferenceModule {}
