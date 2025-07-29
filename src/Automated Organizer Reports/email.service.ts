import { Injectable, Logger } from "@nestjs/common";
import { WeeklyReportData } from "./weekly-report.service";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWeeklyReport(reportData: WeeklyReportData): Promise<void> {
    try {
      const htmlContent = this.generateEmailTemplate(reportData);

      const mailOptions = {
        from: process.env.FROM_EMAIL || "reports@yourapp.com",
        to: reportData.organizerEmail,
        subject: `Weekly Report - ${this.formatDateRange(
          reportData.weekPeriod
        )}`,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Weekly report sent to ${reportData.organizerEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${reportData.organizerEmail}`,
        error
      );
      throw error;
    }
  }
  private generateEmailTemplate(data: WeeklyReportData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Report</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .metrics { display: flex; justify-content: space-between; margin: 20px 0; }
            .metric { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric h3 { margin: 0; color: #4CAF50; }
            .metric p { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; }
            .event-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .event-table th, .event-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .event-table th { background: #4CAF50; color: white; }
            .footer { background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Weekly Performance Report</h1>
                <p>Hello ${data.organizerName}!</p>
                <p>${this.formatDateRange(data.weekPeriod)}</p>
            </div>
            
            <div class="content">
                <div class="metrics">
                    <div class="metric">
                        <h3>Total Sales</h3>
                        <p>${data.ticketSales.totalSold}</p>
                    </div>
                    <div class="metric">
                        <h3>Revenue</h3>
                        <p>$${data.ticketSales.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div class="metric">
                        <h3>Total Views</h3>
                        <p>${data.eventViews.totalViews.toLocaleString()}</p>
                    </div>
                </div>

                <h2>📈 Performance Metrics</h2>
                <ul>
                    <li><strong>Conversion Rate:</strong> ${
                      data.performanceMetrics.conversionRate
                    }%</li>
                    <li><strong>Average Ticket Price:</strong> $${
                      data.performanceMetrics.averageTicketPrice
                    }</li>
                    <li><strong>Top Performing Event:</strong> ${
                      data.performanceMetrics.topPerformingEvent
                    }</li>
                </ul>

                <h2>🎫 Sales by Event</h2>
                <table class="event-table">
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Tickets Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.ticketSales.salesByEvent
                          .map(
                            (event) => `
                            <tr>
                                <td>${event.eventName}</td>
                                <td>${event.ticketsSold}</td>
                                <td>$${event.revenue.toLocaleString()}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>

                <h2>👀 Views by Event</h2>
                <table class="event-table">
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.eventViews.viewsByEvent
                          .map(
                            (event) => `
                            <tr>
                                <td>${event.eventName}</td>
                                <td>${event.views.toLocaleString()}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            
            <div class="footer">
                <p>Keep up the great work! 🚀</p>
                <p>Need help? Contact us at support@yourapp.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private formatDateRange(period: { startDate: Date; endDate: Date }): string {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    return `${period.startDate.toLocaleDateString(
      "en-US",
      options
    )} - ${period.endDate.toLocaleDateString("en-US", options)}`;
  }
}
