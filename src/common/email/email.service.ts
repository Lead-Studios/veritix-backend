import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sendgrid from '@sendgrid/mail';

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isMockMode: boolean;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@veritix.com';

    if (apiKey) {
      sendgrid.setApiKey(apiKey);
      this.isMockMode = false;
      this.logger.log('SendGrid email service initialized');
    } else {
      this.isMockMode = true;
      this.logger.warn(
        'SendGrid API key not set - email service running in mock mode (logs to console)',
      );
    }
  }

  async sendEmail({ to, subject, html }: SendEmailDto): Promise<void> {
    if (this.isMockMode) {
      this.logger.log(`[MOCK EMAIL] To: ${to}`);
      this.logger.log(`[MOCK EMAIL] Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] Body: ${html.substring(0, 200)}...`);
      return;
    }

    try {
      await sendgrid.send({
        to,
        from: this.fromEmail,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.message);
      throw error;
    }
  }

  private loadTemplate(name: string): string {
    return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf-8');
  }

  async sendSecurityAlert(email: string, actionDescription: string): Promise<void> {
    const html = this.loadTemplate('security-alert.html').replace(
      '{{actionDescription}}',
      actionDescription,
    );
    await this.sendEmail({ to: email, subject: 'Security Alert - Veritix', html });
  }

  async sendEventStatusChange(
    organizerEmail: string,
    eventTitle: string,
    newStatus: string,
    reason?: string,
  ): Promise<void> {
    const html = this.loadTemplate('event-status-change.html')
      .replace('{{eventTitle}}', eventTitle)
      .replace('{{newStatus}}', newStatus)
      .replace('{{reason}}', reason ?? 'N/A');
    await this.sendEmail({
      to: organizerEmail,
      subject: `Event Status Update: ${eventTitle} - Veritix`,
      html,
    });
  }

  async sendWaitlistNotification(email: string, eventTitle: string): Promise<void> {
    const html = this.loadTemplate('waitlist-notification.html').replace(
      '{{eventTitle}}',
      eventTitle,
    );
    await this.sendEmail({
      to: email,
      subject: `Ticket Available: ${eventTitle} - Veritix`,
      html,
    });
  }
}
