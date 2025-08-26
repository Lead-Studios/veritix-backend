import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WalletPass } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

export interface LocationNotificationJobData {
  passId: string;
  userId: string;
  title: string;
  body: string;
  data: {
    passId: string;
    eventId: string;
    triggerType: 'location';
    location: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface BeaconNotificationJobData {
  passId: string;
  userId: string;
  title: string;
  body: string;
  data: {
    passId: string;
    eventId: string;
    triggerType: 'beacon';
    beacon: {
      proximityUUID: string;
      major?: number;
      minor?: number;
      proximity: string;
    };
  };
}

export interface ShareNotificationJobData {
  passId: string;
  eventName: string;
  senderName: string;
  shareUrl: string;
  shareMessage?: string;
  recipients: string[];
  expiresAt?: Date;
}

export interface BulkNotificationJobData {
  passIds: string[];
  notificationType: 'update' | 'reminder' | 'expiry' | 'event_change';
  title: string;
  body: string;
  data?: any;
  scheduledFor?: Date;
}

@Injectable()
@Processor('location-notifications')
export class LocationNotificationProcessor {
  private readonly logger = new Logger(LocationNotificationProcessor.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  @Process('send-location-notification')
  async sendLocationNotification(job: Job<LocationNotificationJobData>) {
    this.logger.log(`Sending location notification for pass: ${job.data.passId}`);

    try {
      const { passId, userId, title, body, data } = job.data;

      // Get pass details
      const pass = await this.passRepository.findOne({
        where: { id: passId },
        relations: ['user', 'event'],
      });

      if (!pass) {
        throw new Error('Pass not found');
      }

      // Send push notification
      await this.sendPushNotification(userId, {
        title,
        body,
        data: {
          ...data,
          notificationId: `loc_${Date.now()}`,
        },
      });

      // Track notification analytics
      await this.trackNotificationAnalytics(passId, 'location_notification', {
        location: data.location,
        notificationSent: true,
      });

      this.logger.log(`Location notification sent successfully for pass: ${passId}`);

      return {
        success: true,
        passId,
        notificationType: 'location',
      };
    } catch (error) {
      this.logger.error(`Failed to send location notification: ${error.message}`);
      throw error;
    }
  }

  @Process('send-beacon-notification')
  async sendBeaconNotification(job: Job<BeaconNotificationJobData>) {
    this.logger.log(`Sending beacon notification for pass: ${job.data.passId}`);

    try {
      const { passId, userId, title, body, data } = job.data;

      // Get pass details
      const pass = await this.passRepository.findOne({
        where: { id: passId },
        relations: ['user', 'event'],
      });

      if (!pass) {
        throw new Error('Pass not found');
      }

      // Send push notification
      await this.sendPushNotification(userId, {
        title,
        body,
        data: {
          ...data,
          notificationId: `beacon_${Date.now()}`,
        },
      });

      // Track notification analytics
      await this.trackNotificationAnalytics(passId, 'beacon_notification', {
        beacon: data.beacon,
        notificationSent: true,
      });

      this.logger.log(`Beacon notification sent successfully for pass: ${passId}`);

      return {
        success: true,
        passId,
        notificationType: 'beacon',
      };
    } catch (error) {
      this.logger.error(`Failed to send beacon notification: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private async sendPushNotification(userId: string, notification: any): Promise<void> {
    // Implementation would integrate with push notification service (FCM, APNS, etc.)
    this.logger.log(`Sending push notification to user ${userId}: ${notification.title}`);
    
    // Example implementation with FCM
    const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      this.logger.warn('FCM server key not configured, skipping push notification');
      return;
    }

    try {
      // Get user's FCM token (would be stored in user profile)
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        this.logger.warn(`No FCM token found for user ${userId}`);
        return;
      }

      const payload = {
        to: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: 'wallet_icon',
          click_action: 'OPEN_WALLET_PASS',
        },
        data: notification.data,
      };

      await this.httpService.axiosRef.post(
        'https://fcm.googleapis.com/fcm/send',
        payload,
        {
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Push notification sent successfully to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      throw error;
    }
  }

  private async getUserFCMToken(userId: string): Promise<string | null> {
    // Implementation would fetch FCM token from user profile
    // This is a placeholder
    return null;
  }

  private async trackNotificationAnalytics(
    passId: string,
    notificationType: string,
    eventData: any
  ): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        eventData: {
          notificationType,
          ...eventData,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track notification analytics: ${error.message}`);
    }
  }
}

@Injectable()
@Processor('pass-sharing')
export class PassSharingProcessor {
  private readonly logger = new Logger(PassSharingProcessor.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  @Process('send-share-notifications')
  async sendShareNotifications(job: Job<ShareNotificationJobData>) {
    this.logger.log(`Sending share notifications for pass: ${job.data.passId}`);

    try {
      const { passId, eventName, senderName, shareUrl, shareMessage, recipients, expiresAt } = job.data;

      const results = [];

      for (const recipient of recipients) {
        try {
          await this.sendShareEmail(recipient, {
            eventName,
            senderName,
            shareUrl,
            shareMessage,
            expiresAt,
          });

          results.push({
            recipient,
            success: true,
            method: 'email',
          });
        } catch (error) {
          this.logger.error(`Failed to send share notification to ${recipient}: ${error.message}`);
          results.push({
            recipient,
            success: false,
            error: error.message,
          });
        }
      }

      // Track sharing analytics
      await this.trackSharingAnalytics(passId, recipients.length, results.filter(r => r.success).length);

      const successCount = results.filter(r => r.success).length;
      this.logger.log(`Share notifications completed: ${successCount}/${recipients.length} sent successfully`);

      return {
        success: successCount > 0,
        totalRecipients: recipients.length,
        successfulSends: successCount,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to send share notifications: ${error.message}`);
      throw error;
    }
  }

  @Process('send-bulk-notifications')
  async sendBulkNotifications(job: Job<BulkNotificationJobData>) {
    this.logger.log(`Sending bulk notifications to ${job.data.passIds.length} passes`);

    try {
      const { passIds, notificationType, title, body, data, scheduledFor } = job.data;

      // If scheduled for future, delay the job
      if (scheduledFor && scheduledFor > new Date()) {
        const delay = scheduledFor.getTime() - Date.now();
        await job.delay(delay);
      }

      const passes = await this.passRepository.find({
        where: { id: { $in: passIds } as any },
        relations: ['user', 'event'],
      });

      const results = [];
      let processed = 0;

      for (const pass of passes) {
        try {
          // Send notification based on type
          await this.sendPassNotification(pass, {
            type: notificationType,
            title,
            body,
            data,
          });

          results.push({
            passId: pass.id,
            userId: pass.userId,
            success: true,
          });
        } catch (error) {
          this.logger.error(`Failed to send notification to pass ${pass.id}: ${error.message}`);
          results.push({
            passId: pass.id,
            userId: pass.userId,
            success: false,
            error: error.message,
          });
        }

        processed++;
        await job.progress((processed / passes.length) * 100);
      }

      const successCount = results.filter(r => r.success).length;
      this.logger.log(`Bulk notifications completed: ${successCount}/${passes.length} sent successfully`);

      return {
        success: successCount > 0,
        totalPasses: passes.length,
        successfulSends: successCount,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to send bulk notifications: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private async sendShareEmail(recipient: string, shareData: any): Promise<void> {
    const emailService = this.configService.get<string>('EMAIL_SERVICE');
    
    if (emailService === 'sendgrid') {
      await this.sendShareEmailViaSendGrid(recipient, shareData);
    } else if (emailService === 'ses') {
      await this.sendShareEmailViaSES(recipient, shareData);
    } else {
      // Default SMTP implementation
      await this.sendShareEmailViaSMTP(recipient, shareData);
    }
  }

  private async sendShareEmailViaSendGrid(recipient: string, shareData: any): Promise<void> {
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const emailContent = this.generateShareEmailContent(shareData);

    const payload = {
      personalizations: [{
        to: [{ email: recipient }],
        subject: `${shareData.senderName} shared an event ticket with you`,
      }],
      from: {
        email: this.configService.get<string>('FROM_EMAIL', 'noreply@veritix.com'),
        name: 'Veritix',
      },
      content: [{
        type: 'text/html',
        value: emailContent,
      }],
    };

    await this.httpService.axiosRef.post(
      'https://api.sendgrid.com/v3/mail/send',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async sendShareEmailViaSES(recipient: string, shareData: any): Promise<void> {
    // AWS SES implementation would go here
    this.logger.log(`Sending share email via SES to ${recipient}`);
  }

  private async sendShareEmailViaSMTP(recipient: string, shareData: any): Promise<void> {
    // SMTP implementation would go here
    this.logger.log(`Sending share email via SMTP to ${recipient}`);
  }

  private generateShareEmailContent(shareData: any): string {
    const { eventName, senderName, shareUrl, shareMessage, expiresAt } = shareData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Ticket Shared</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Event Ticket Shared</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p><strong>${senderName}</strong> has shared an event ticket with you:</p>
            <h3>📅 ${eventName}</h3>
            ${shareMessage ? `<p><em>"${shareMessage}"</em></p>` : ''}
            <p>Click the button below to add this ticket to your mobile wallet:</p>
            <a href="${shareUrl}" class="button">Add to Wallet</a>
            <p><small>This link ${expiresAt ? `expires on ${expiresAt.toLocaleDateString()}` : 'does not expire'}.</small></p>
          </div>
          <div class="footer">
            <p>This email was sent by Veritix. If you didn't expect this email, you can safely ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendPassNotification(pass: WalletPass, notification: any): Promise<void> {
    // Send push notification to pass owner
    await this.sendPushNotification(pass.userId, {
      title: notification.title,
      body: notification.body,
      data: {
        passId: pass.id,
        eventId: pass.eventId,
        notificationType: notification.type,
        ...notification.data,
      },
    });

    // Track notification
    await this.trackNotificationAnalytics(pass.id, notification.type, {
      notificationSent: true,
      title: notification.title,
      body: notification.body,
    });
  }

  private async sendPushNotification(userId: string, notification: any): Promise<void> {
    // Same implementation as in LocationNotificationProcessor
    this.logger.log(`Sending push notification to user ${userId}: ${notification.title}`);
    
    const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      this.logger.warn('FCM server key not configured, skipping push notification');
      return;
    }

    try {
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        this.logger.warn(`No FCM token found for user ${userId}`);
        return;
      }

      const payload = {
        to: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: 'wallet_icon',
          click_action: 'OPEN_WALLET_PASS',
        },
        data: notification.data,
      };

      await this.httpService.axiosRef.post(
        'https://fcm.googleapis.com/fcm/send',
        payload,
        {
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      throw error;
    }
  }

  private async getUserFCMToken(userId: string): Promise<string | null> {
    // Implementation would fetch FCM token from user profile
    return null;
  }

  private async trackSharingAnalytics(
    passId: string,
    totalRecipients: number,
    successfulSends: number
  ): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.PASS_SHARED,
        timestamp: new Date(),
        eventData: {
          shareCount: totalRecipients,
          successfulNotifications: successfulSends,
          shareMethod: 'email',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track sharing analytics: ${error.message}`);
    }
  }

  private async trackNotificationAnalytics(
    passId: string,
    notificationType: string,
    eventData: any
  ): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        eventData: {
          notificationType,
          ...eventData,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track notification analytics: ${error.message}`);
    }
  }
}
