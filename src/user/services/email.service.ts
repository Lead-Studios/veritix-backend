import { Injectable, Logger } from '@nestjs/common';
// import * as nodemailer from 'nodemailer'; // Uncomment and configure for real email

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(email: string, token: string) {
    // TODO: Implement real email sending
    this.logger.log(`Send verification email to ${email} with token: ${token}`);
    return true;
  }

  async sendPasswordResetEmail(email: string, token: string) {
    // TODO: Implement real email sending
    this.logger.log(`Send password reset email to ${email} with token: ${token}`);
    return true;
  }
} 