import { Module } from '@nestjs/common';
import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsEventController } from './analytics-event.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventView } from './entities/event-view.entity';
import { PurchaseLog } from './entities/purchase-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventView, PurchaseLog, Event])],
  controllers: [AnalyticsEventController],
  providers: [AnalyticsEventService],
  exports: [AnalyticsEventService],
})
export class AnalyticsEventModule {}
