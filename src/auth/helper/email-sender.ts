import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  loadHtmlTemplate,
  replacePlaceholders,
} from '../../config/email/email.service';
import { getSendGridConfig } from 'src/config/email/sendgrid-config';


@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(to: string, subject: string, htmlBody: string) {
    const sendGrid = getSendGridConfig();

    // ✅ MOCK MODE (Wave 1 / Dev)
    if (!sendGrid) {
      this.logger.warn(
        `[EMAIL MOCK] to=${to}, subject=${subject}`,
      );
      return { success: true, mocked: true };
    }

    const msg = {
      to,
      from: sendGrid.sender, // ✅ correct
      subject,
      html: htmlBody,
    };

    try {
      await sendGrid.client.send(msg); // ✅ correct
      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true, mocked: false };
    } catch (error: any) {
      this.logger.error(
        `SendGrid send failed for ${to}`,
        error?.response?.body || error?.message || error,
      );

      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendVerificationEmail(to: string, otp: string, fullName: string) {
    try {
      let htmlContent = await loadHtmlTemplate('verification-email');

      const placeholders: Record<string, string> = { fullName };
      otp.split('').forEach((digit, index) => {
        placeholders[`otp${index + 1}`] = digit;
      });

      htmlContent = replacePlaceholders(htmlContent, placeholders);

      await this.sendEmail(to, 'OTP Verification Code', htmlContent);
    } catch (error) {
      this.logger.error(`Error sending OTP email to ${to}`, error);
      throw new InternalServerErrorException('Error sending OTP email');
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, fullName: string) {
    try {
      let htmlContent = await loadHtmlTemplate('reset-password-email');

      const placeholders: Record<string, string> = { fullName };
      otp.split('').forEach((digit, index) => {
        placeholders[`otp${index + 1}`] = digit;
      });

      htmlContent = replacePlaceholders(htmlContent, placeholders);

      await this.sendEmail(to, 'Password Reset Code', htmlContent);
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${to}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error in sending password reset email',
      );
    }
  }
}
