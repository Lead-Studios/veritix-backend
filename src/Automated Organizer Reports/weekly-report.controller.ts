import { Controller, Get, Post, Param } from "@nestjs/common";
import { WeeklyReportService } from "./weekly-report.service";

@Controller("weekly-reports")
export class WeeklyReportController {
  constructor(private readonly weeklyReportService: WeeklyReportService) {}

  @Post("generate-all")
  async generateAllWeeklyReports() {
    await this.weeklyReportService.generateAndSendWeeklyReports();
    return { message: "Weekly reports generation initiated" };
  }

  @Post("generate/:organizerId")
  async generateReportForOrganizer(@Param("organizerId") organizerId: string) {
    await this.weeklyReportService.sendWeeklyReport(organizerId);
    return { message: `Weekly report sent for organizer ${organizerId}` };
  }

  @Get(":organizerId")
  async getWeeklyReport(@Param("organizerId") organizerId: string) {
    const report = await this.weeklyReportService.generateReportForOrganizer(
      organizerId
    );
    return report;
  }
}
