import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
}
