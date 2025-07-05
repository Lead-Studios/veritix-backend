import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketHistory } from '../ticket/entities/ticket-history.entity';
import { Ticket } from '../ticketing/entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import { EventAnalyticsService } from './services/event-analytics.service';
import { EventAnalyticsController } from './controllers/event-analytics.controller';
import { ConferenceTicketAnalyticsService } from './services/conference-ticket-analytics.service';
import { ConferenceTicketAnalyticsController } from './controllers/conference-ticket-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketHistory, 
      Ticket, 
      Conference
    ])
  ],
  providers: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService
  ],
  controllers: [
    EventAnalyticsController,
    ConferenceTicketAnalyticsController
  ],
  exports: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService
  ],
})
export class AnalyticsModule {} 
