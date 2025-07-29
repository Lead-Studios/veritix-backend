import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { WeeklyReportService } from "./weekly-report.service";
import { WeeklyReportController } from "./weekly-report.controller";
import { EmailService } from "./email.service";
import { ReportGeneratorService } from "./report-generator.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WeeklyReportController],
  providers: [WeeklyReportService, EmailService, ReportGeneratorService],
  exports: [WeeklyReportService],
})
export class WeeklyReportModule {}
