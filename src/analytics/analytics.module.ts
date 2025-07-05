import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketHistory } from '../ticket/entities/ticket-history.entity';
import { Ticket } from '../ticketing/entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import { Session } from './entities/session.entity';
import { Attendance } from './entities/attendance.entity';
import { Feedback } from './entities/feedback.entity';
import { EventAnalyticsService } from './services/event-analytics.service';
import { EventAnalyticsController } from './controllers/event-analytics.controller';
import { ConferenceTicketAnalyticsService } from './services/conference-ticket-analytics.service';
import { ConferenceTicketAnalyticsController } from './controllers/conference-ticket-analytics.controller';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { SessionAnalyticsController } from './controllers/session-analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { ExportService } from './services/export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketHistory, 
      Ticket, 
      Conference,
      Session,
      Attendance,
      Feedback
    ])
  ],
  providers: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService,
    SessionAnalyticsService,
    AnalyticsService,
    ExportService
  ],
  controllers: [
    EventAnalyticsController,
    ConferenceTicketAnalyticsController,
    SessionAnalyticsController,
    AnalyticsController
  ],
  exports: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService,
    SessionAnalyticsService,
    AnalyticsService,
    ExportService
  ],
})
export class AnalyticsModule {} 
