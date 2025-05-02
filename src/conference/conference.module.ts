import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conference } from './entities/conference.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AuthModule } from '../auth/auth.module';
import { ConferenceService } from './providers/conference.service';
import { ConferenceController } from './controllers/conference.controller';
import { AnalyticsService } from '../conference/Analytics/analytics.service';
import { AnalyticsController } from '../conference/Analytics/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conference, Ticket]),
    AuthModule,
  ],
  controllers: [ConferenceController, AnalyticsController],
  providers: [ConferenceService, AnalyticsService],
  exports: [ConferenceService],
})
export class ConferenceModule {}
