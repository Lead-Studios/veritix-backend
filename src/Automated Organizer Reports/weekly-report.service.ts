import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ReportGeneratorService } from "./report-generator.service";
import { EmailService } from "./email.service";

export interface WeeklyReportData {
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  weekPeriod: {
    startDate: Date;
    endDate: Date;
  };
  ticketSales: {
    totalSold: number;
    totalRevenue: number;
    salesByEvent: Array<{
      eventId: string;
      eventName: string;
      ticketsSold: number;
      revenue: number;
    }>;
  };
  eventViews: {
    totalViews: number;
    viewsByEvent: Array<{
      eventId: string;
      eventName: string;
      views: number;
    }>;
  };
  performanceMetrics: {
    conversionRate: number;
    averageTicketPrice: number;
    topPerformingEvent: string;
  };
}

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private readonly reportGenerator: ReportGeneratorService,
    private readonly emailService: EmailService
  ) {}

  @Cron(CronExpression.EVERY_WEEK, {
    name: "weekly-report-generation",
    timeZone: "UTC",
  })
  async generateAndSendWeeklyReports(): Promise<void> {
    this.logger.log("Starting weekly report generation...");

    try {
      const organizers = await this.getActiveOrganizers();
      const reportPromises = organizers.map((organizer) =>
        this.processOrganizerReport(organizer)
      );

      const results = await Promise.allSettled(reportPromises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      this.logger.log(
        `Weekly reports completed: ${successful} successful, ${failed} failed`
      );
    } catch (error) {
      this.logger.error("Failed to generate weekly reports", error);
      throw error;
    }
  }

  async generateReportForOrganizer(
    organizerId: string
  ): Promise<WeeklyReportData> {
    return this.reportGenerator.generateWeeklyReport(organizerId);
  }

  async sendWeeklyReport(organizerId: string): Promise<void> {
    const reportData = await this.generateReportForOrganizer(organizerId);
    await this.emailService.sendWeeklyReport(reportData);
  }

  private async processOrganizerReport(organizer: any): Promise<void> {
    try {
      const reportData = await this.reportGenerator.generateWeeklyReport(
        organizer.id
      );
      await this.emailService.sendWeeklyReport(reportData);
      this.logger.log(`Report sent successfully to ${organizer.email}`);
    } catch (error) {
      this.logger.error(`Failed to send report to ${organizer.email}`, error);
      throw error;
    }
  }

  private async getActiveOrganizers(): Promise<
    Array<{ id: string; email: string; name: string }>
  > {
    // This would typically fetch from your database
    // Replace with your actual data source
    return [
      { id: "1", email: "organizer1@example.com", name: "John Doe" },
      { id: "2", email: "organizer2@example.com", name: "Jane Smith" },
    ];
  }
}
