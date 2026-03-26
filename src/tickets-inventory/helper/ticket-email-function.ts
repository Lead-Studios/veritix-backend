import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendTicketConfirmation(ticket: any, event: any) {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src/config/email/email-templates/ticket-confirmation.html',
      );

      let html = fs.readFileSync(templatePath, 'utf-8');

      html = html
        .replace('{{eventTitle}}', event.title)
        .replace('{{eventDate}}', new Date(event.eventDate).toDateString())
        .replace('{{ticketType}}', ticket.ticketType?.name || 'N/A')
        .replace('{{attendeeName}}', ticket.attendeeName || 'Guest')
        .replace('{{qrCodeImage}}', ticket.qrCodeImage);

      // 🔌 integrate your mail provider here (e.g., nodemailer, SES, resend)
      await this.fakeSend(ticket.attendeeEmail, html);

    } catch (error) {
      this.logger.error(
        `Failed to send ticket email for ticket ${ticket.id}: ${error.message}`,
      );
    }
  }

  // Replace this with real provider
  private async fakeSend(to: string, html: string) {
    console.log(`📧 Sending email to ${to}`);
  }
}