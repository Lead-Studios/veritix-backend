import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventAnalyticsController } from './controllers/event-analytics.controller';
import { EventAnalyticsService } from './services/event-analytics.service';
import { AnalyticsTrackingService } from './services/analytics-tracking.service';
import { EventView } from './entities/event-view.entity';
import { PurchaseLog } from './entities/purchase-log.entity';
import { EventEngagement } from './entities/event-engagement.entity';
import { Event } from '../ticketing/entities/event.entity';
import { Refund } from '../refunds/entities/refund.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventView,
      PurchaseLog,
      EventEngagement,
      Event,
      Refund,
    ]),
  ],
  controllers: [EventAnalyticsController],
  providers: [EventAnalyticsService, AnalyticsTrackingService],
  exports: [EventAnalyticsService, AnalyticsTrackingService],
})
export class EventAnalyticsModule {}
