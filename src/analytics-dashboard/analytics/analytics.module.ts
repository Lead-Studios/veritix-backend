import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SpeakersModule } from '../speakers/speakers.module';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    AttendanceModule,
    SessionsModule,
    SpeakersModule,
    FeedbackModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
