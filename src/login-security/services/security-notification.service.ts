import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityNotification, NotificationType, NotificationChannel, NotificationStatus } from '../entities/security-notification.entity';
import { LoginAttempt } from '../entities/login-attempt.entity';

@Injectable()
export class SecurityNotificationService {
  private readonly logger = new Logger(SecurityNotificationService.name);

  constructor(
    @InjectRepository(SecurityNotification)
    private securityNotificationRepository: Repository<SecurityNotification>,
  ) {}

  async sendNewLocationNotification(loginAttempt: LoginAttempt): Promise<SecurityNotification> {
    const location = `${loginAttempt.city}, ${loginAttempt.region}, ${loginAttempt.country}`;
    const title = 'New Location Login Detected';
    const message = `We noticed a login to your account from a new location: ${location}. If this wasn't you, please secure your account immediately.`;

    return this.createNotification({
      type: NotificationType.NEW_LOCATION,
      channel: NotificationChannel.EMAIL,
      title,
      message,
      loginAttempt,
      data: {
        location,
        ipAddress: loginAttempt.ipAddress,
        device: `${loginAttempt.browser} on ${loginAttempt.operatingSystem}`,
        timestamp: loginAttempt.createdAt,
      },
    });
  }

  async sendNewDeviceNotification(loginAttempt: LoginAttempt): Promise<SecurityNotification> {
    const device = `${loginAttempt.browser} on ${loginAttempt.operatingSystem}`;
    const title = 'New Device Login Detected';
    const message = `We noticed a login to your account from a new device: ${device}. If this wasn't you, please secure your account immediately.`;

    return this.createNotification({
      type: NotificationType.NEW_DEVICE,
      channel: NotificationChannel.EMAIL,
      title,
      message,
      loginAttempt,
      data: {
        device,
        deviceType: loginAttempt.deviceType,
        ipAddress: loginAttempt.ipAddress,
        location: `${loginAttempt.city}, ${loginAttempt.country}`,
        timestamp: loginAttempt.createdAt,
      },
    });
  }

  async sendSuspiciousLoginNotification(loginAttempt: LoginAttempt): Promise<SecurityNotification> {
    const title = 'Suspicious Login Activity Detected';
    const message = `We detected suspicious login activity on your account. Please review your recent activity and secure your account if necessary.`;

    return this.createNotification({
      type: NotificationType.SUSPICIOUS_LOGIN,
      channel: NotificationChannel.EMAIL,
      title,
      message,
      loginAttempt,
      data: {
        ipAddress: loginAttempt.ipAddress,
        location: `${loginAttempt.city}, ${loginAttempt.country}`,
        device: `${loginAttempt.browser} on ${loginAttempt.operatingSystem}`,
        timestamp: loginAttempt.createdAt,
        reason: 'Multiple factors indicate suspicious activity',
      },
    });
  }

  async sendFailedLoginAttemptsNotification(userId: string, attemptCount: number, ownerId?: string): Promise<SecurityNotification> {
    const title = 'Multiple Failed Login Attempts';
    const message = `We detected ${attemptCount} failed login attempts on your account. If this wasn't you, your account may be under attack.`;

    const notification = this.securityNotificationRepository.create({
      type: NotificationType.FAILED_LOGIN_ATTEMPTS,
      channel: NotificationChannel.EMAIL,
      title,
      message,
      userId,
      data: {
        attemptCount,
        timestamp: new Date(),
      },
      ownerId,
    });

    const saved = await this.securityNotificationRepository.save(notification);
    await this.processNotification(saved);
    return saved;
  }

  async markAsRead(notificationId: string, userId: string, ownerId?: string): Promise<void> {
    const where: any = { id: notificationId, userId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    await this.securityNotificationRepository.update(where, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
  }

  async getUserNotifications(userId: string, limit = 50, ownerId?: string): Promise<SecurityNotification[]> {
    const where: any = { userId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.securityNotificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['loginAttempt'],
    });
  }

  async getUnreadCount(userId: string, ownerId?: string): Promise<number> {
    const where: any = { userId, status: NotificationStatus.SENT };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.securityNotificationRepository.count({ where });
  }

  private async createNotification(params: {
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    loginAttempt: LoginAttempt;
    data?: Record<string, any>;
  }): Promise<SecurityNotification> {
    const notification = this.securityNotificationRepository.create({
      type: params.type,
      channel: params.channel,
      title: params.title,
      message: params.message,
      userId: params.loginAttempt.userId,
      loginAttemptId: params.loginAttempt.id,
      data: params.data,
      ownerId: params.loginAttempt.ownerId,
    });

    const saved = await this.securityNotificationRepository.save(notification);
    await this.processNotification(saved);
    return saved;
  }

  private async processNotification(notification: SecurityNotification): Promise<void> {
    try {
      // In a real implementation, you would integrate with email service, SMS service, etc.
      // For now, we'll just simulate sending the notification
      
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSmsNotification(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;
        case NotificationChannel.IN_APP:
          // In-app notifications are handled by just storing in database
          break;
      }

      await this.securityNotificationRepository.update(notification.id, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      this.logger.log(`Security notification sent: ${notification.type} to user ${notification.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send security notification ${notification.id}:`, error);
      
      await this.securityNotificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
        retryCount: notification.retryCount + 1,
      });
    }
  }

  private async sendEmailNotification(notification: SecurityNotification): Promise<void> {
    // Simulate email sending - integrate with your email service (SendGrid, AWS SES, etc.)
    this.logger.log(`Sending email notification: ${notification.title}`);
    
    // Example integration point:
    // await this.emailService.send({
    //   to: notification.recipient || 'user@example.com',
    //   subject: notification.title,
    //   html: this.generateEmailTemplate(notification),
    // });
  }

  private async sendSmsNotification(notification: SecurityNotification): Promise<void> {
    // Simulate SMS sending - integrate with SMS service (Twilio, AWS SNS, etc.)
    this.logger.log(`Sending SMS notification: ${notification.title}`);
  }

  private async sendPushNotification(notification: SecurityNotification): Promise<void> {
    // Simulate push notification - integrate with push service (FCM, APNS, etc.)
    this.logger.log(`Sending push notification: ${notification.title}`);
  }

  private generateEmailTemplate(notification: SecurityNotification): string {
    return `
      <html>
        <body>
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          
          ${notification.data ? `
            <h3>Details:</h3>
            <ul>
              ${Object.entries(notification.data).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          ` : ''}
          
          <p>If this wasn't you, please:</p>
          <ul>
            <li>Change your password immediately</li>
            <li>Review your account activity</li>
            <li>Enable two-factor authentication</li>
            <li>Contact support if needed</li>
          </ul>
          
          <p>Best regards,<br>Veritix Security Team</p>
        </body>
      </html>
    `;
  }
}
