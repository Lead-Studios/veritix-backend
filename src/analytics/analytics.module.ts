import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketHistory } from '../ticket/entities/ticket-history.entity';
import { EventAnalyticsService } from './services/event-analytics.service';
import { EventAnalyticsController } from './controllers/event-analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TicketHistory])],
  providers: [EventAnalyticsService],
  controllers: [EventAnalyticsController],
})
export class AnalyticsModule {} 
