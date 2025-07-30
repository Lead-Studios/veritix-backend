import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketHistory } from '../ticket/entities/ticket-history.entity';
import { TicketingTicket } from '../ticketing/entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import { Session } from './entities/session.entity';
import { Attendance } from './entities/attendance.entity';
import { Feedback } from './entities/feedback.entity';
import { PurchaseLocation } from './entities/purchase-location.entity';
import { PurchaseLog } from '../event-analytics/entities/purchase-log.entity';
import { EventAnalyticsService } from './services/event-analytics.service';
import { EventAnalyticsController } from './controllers/event-analytics.controller';
import { ConferenceTicketAnalyticsService } from './services/conference-ticket-analytics.service';
import { ConferenceTicketAnalyticsController } from './controllers/conference-ticket-analytics.controller';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { SessionAnalyticsController } from './controllers/session-analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { ExportService } from './services/export.service';
import { MapVisualizationService } from './services/map-visualization.service';
import { MapVisualizationController } from './controllers/map-visualization.controller';
import { GeolocationService } from './services/geolocation.service';
import { PurchaseAggregationService } from './services/purchase-aggregation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketHistory,
      TicketingTicket,
      Conference,
      Session,
      Attendance,
      Feedback,
    ]),
      PurchaseLocation,
      PurchaseLog
    ])
  ],
  providers: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService,
    SessionAnalyticsService,
    AnalyticsService,
    ExportService,
    MapVisualizationService,
    GeolocationService,
    PurchaseAggregationService
  ],
  controllers: [
    EventAnalyticsController,
    ConferenceTicketAnalyticsController,
    SessionAnalyticsController,
    AnalyticsController,
    MapVisualizationController
  ],
  exports: [
    EventAnalyticsService,
    ConferenceTicketAnalyticsService,
    SessionAnalyticsService,
    AnalyticsService,
    ExportService,
    MapVisualizationService,
    GeolocationService,
    PurchaseAggregationService
  ],
})
export class AnalyticsModule {}
