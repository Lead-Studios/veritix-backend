import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AnalyticsController } from "./controllers/analytics.controller"
import { AnalyticsService } from "./services/analytics.service"
import { ExportService } from "./services/export.service"
import { Conference } from "./entities/conference.entity"
import { Session } from "./entities/session.entity"
import { Attendance } from "./entities/attendance.entity"
import { Feedback } from "./entities/feedback.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Conference, Session, Attendance, Feedback])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExportService],
  exports: [AnalyticsService, ExportService],
})
export class AnalyticsModule {}
