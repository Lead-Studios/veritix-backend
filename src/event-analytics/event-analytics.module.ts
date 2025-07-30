import { Module } from '@nestjs/common';
import { EventAnalyticsController } from './controllers/event-analytics.controller';
import { EventAnalyticsService } from './services/event-analytics.service';
import { AnalyticsTrackingService } from './services/analytics-tracking.service';
import { EventView } from './entities/event-view.entity';
import { PurchaseLog } from './entities/purchase-log.entity';
import { EventEngagement } from './entities/event-engagement.entity';
import { TicketingEvent } from '../ticketing/entities/event.entity';
import { Refund } from '../refunds/entities/refund.entity';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TenantRepositoryModule.forFeature([
      EventView,
      PurchaseLog,
      EventEngagement,
      TicketingEvent,
      Refund,
    ]),
  ],
  controllers: [EventAnalyticsController],
  providers: [EventAnalyticsService, AnalyticsTrackingService],
  exports: [EventAnalyticsService, AnalyticsTrackingService],
})
export class EventAnalyticsModule {}
