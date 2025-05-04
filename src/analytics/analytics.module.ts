import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsService } from "./analytics.service"
import { Attendance } from "./entities/attendance.entity"
import { ConferenceModule } from "../conference/conference.module"

@Module({
  imports: [TypeOrmModule.forFeature([Attendance]), ConferenceModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
