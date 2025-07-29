import { Injectable, Logger } from '@nestjs/common';
// import * as nodemailer from 'nodemailer'; // Uncomment and configure for real email

export interface AnnouncementEmailData {
  subject: string;
  content: string;
  eventName: string;
  eventId: string;
  announcementType: string;
  priority: string;
}

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

  async sendAnnouncementEmail(email: string, data: AnnouncementEmailData) {
    // TODO: Implement real email sending with proper HTML template
    this.logger.log(`Send announcement email to ${email}: ${data.subject}`);
    
    // Example implementation with nodemailer:
    // const transporter = nodemailer.createTransporter({
    //   host: process.env.SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT),
    //   secure: false,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
    
    // const htmlContent = this.generateAnnouncementEmailTemplate(data);
    
    // await transporter.sendMail({
    //   from: process.env.FROM_EMAIL,
    //   to: email,
    //   subject: `[${data.announcementType.toUpperCase()}] ${data.subject}`,
    //   html: htmlContent,
    // });
    
    return true;
  }

  private generateAnnouncementEmailTemplate(data: AnnouncementEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Announcement</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .priority-urgent { border-left: 4px solid #f44336; }
          .priority-high { border-left: 4px solid #ff9800; }
          .priority-medium { border-left: 4px solid #2196F3; }
          .priority-low { border-left: 4px solid #4CAF50; }
          .footer { background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Event Announcement</h1>
            <p><strong>${data.eventName}</strong></p>
          </div>
          
          <div class="content priority-${data.priority}">
            <h2>${data.subject}</h2>
            <p>${data.content}</p>
            <hr>
            <p><small>This is an automated announcement from your event organizers.</small></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Veritix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
} 