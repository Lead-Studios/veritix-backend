import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntelligentWaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistNotificationPreference, NotificationChannel, NotificationTiming } from '../entities/waitlist-notification-preference.entity';
import { WaitlistTicketRelease, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';

export interface CampaignTemplate {
  id: string;
  name: string;
  type: 'position_update' | 'ticket_available' | 'price_drop' | 'event_reminder' | 'custom';
  channels: NotificationChannel[];
  content: {
    subject?: string;
    emailTemplate?: string;
    smsTemplate?: string;
    pushTitle?: string;
    pushBody?: string;
    variables?: string[];
  };
  targeting: {
    priorities?: string[];
    positions?: { min?: number; max?: number };
    waitTime?: { min?: number; max?: number };
    priceRange?: { min?: number; max?: number };
  };
  scheduling: {
    immediate?: boolean;
    delay?: number; // minutes
    quietHours?: boolean;
    timezone?: string;
  };
}

@Injectable()
export class NotificationCampaignService {
  private readonly logger = new Logger(NotificationCampaignService.name);

  constructor(
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistNotificationPreference)
    private preferencesRepository: Repository<WaitlistNotificationPreference>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectQueue('email-notifications')
    private emailQueue: Queue,
    @InjectQueue('sms-notifications')
    private smsQueue: Queue,
    @InjectQueue('push-notifications')
    private pushQueue: Queue,
  ) {}

  /**
   * Send ticket availability notification
   */
  async sendTicketAvailableNotification(releaseId: string): Promise<{
    success: boolean;
    sentChannels: string[];
    errors: any[];
  }> {
    this.logger.log(`Sending ticket available notification for release ${releaseId}`);

    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['waitlistEntry', 'waitlistEntry.user', 'waitlistEntry.notificationPreferences', 'event'],
    });

    if (!release) {
      throw new Error('Ticket release not found');
    }

    const { waitlistEntry } = release;
    const preferences = waitlistEntry.notificationPreferences.filter(p => 
      p.enabled && p.notificationTypes?.ticketAvailable
    );

    const sentChannels: string[] = [];
    const errors: any[] = [];

    for (const preference of preferences) {
      try {
        const shouldSend = await this.shouldSendNotification(preference, waitlistEntry);
        if (!shouldSend) continue;

        const notificationData = {
          userId: waitlistEntry.userId,
          eventId: waitlistEntry.eventId,
          releaseId,
          userEmail: waitlistEntry.user.email,
          userName: `${waitlistEntry.user.firstName} ${waitlistEntry.user.lastName}`,
          eventName: release.event.name,
          ticketQuantity: release.ticketQuantity,
          offerPrice: release.offerPrice,
          expiresAt: release.expiresAt,
          position: waitlistEntry.position,
          timeRemaining: release.timeRemaining,
        };

        await this.sendNotificationByChannel(preference, notificationData);
        sentChannels.push(preference.channel);

      } catch (error) {
        this.logger.error(`Failed to send ${preference.channel} notification:`, error);
        errors.push({
          channel: preference.channel,
          error: error.message,
        });
      }
    }

    // Update release with notification details
    await this.releaseRepository.update(releaseId, {
      notificationDetails: {
        sentAt: new Date(),
        channels: sentChannels,
        deliveryStatus: errors.length === 0 ? 'sent' : 'partial',
      },
    });

    return {
      success: errors.length === 0,
      sentChannels,
      errors,
    };
  }

  /**
   * Send position update notifications
   */
  async sendPositionUpdateNotifications(eventId: string): Promise<void> {
    this.logger.log(`Sending position update notifications for event ${eventId}`);

    const entries = await this.waitlistRepository.find({
      where: { eventId, status: WaitlistStatus.ACTIVE },
      relations: ['user', 'notificationPreferences'],
      order: { position: 'ASC' },
    });

    for (const entry of entries) {
      const preferences = entry.notificationPreferences.filter(p => 
        p.enabled && p.notificationTypes?.positionUpdate
      );

      for (const preference of preferences) {
        try {
          const shouldSend = await this.shouldSendNotification(preference, entry);
          if (!shouldSend) continue;

          const notificationData = {
            userId: entry.userId,
            eventId: entry.eventId,
            userEmail: entry.user.email,
            userName: `${entry.user.firstName} ${entry.user.lastName}`,
            currentPosition: entry.position,
            estimatedWaitTime: entry.estimatedWaitTime,
            totalAhead: entry.position - 1,
          };

          await this.sendNotificationByChannel(preference, notificationData, 'position_update');

        } catch (error) {
          this.logger.error(`Failed to send position update to user ${entry.userId}:`, error);
        }
      }
    }
  }

  /**
   * Send expiration warning notifications
   */
  async sendExpirationWarnings(): Promise<void> {
    this.logger.log('Sending expiration warning notifications');

    const expiringReleases = await this.releaseRepository.find({
      where: {
        status: ReleaseStatus.OFFERED,
        expiresAt: Between(new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000)), // Next 2 hours
      },
      relations: ['waitlistEntry', 'waitlistEntry.user', 'waitlistEntry.notificationPreferences'],
    });

    for (const release of expiringReleases) {
      const preferences = release.waitlistEntry.notificationPreferences.filter(p => 
        p.enabled && p.notificationTypes?.reminderBeforeExpiry
      );

      for (const preference of preferences) {
        try {
          const notificationData = {
            userId: release.waitlistEntry.userId,
            eventId: release.eventId,
            releaseId: release.id,
            userEmail: release.waitlistEntry.user.email,
            userName: `${release.waitlistEntry.user.firstName} ${release.waitlistEntry.user.lastName}`,
            expiresAt: release.expiresAt,
            timeRemaining: release.timeRemaining,
            ticketQuantity: release.ticketQuantity,
            offerPrice: release.offerPrice,
          };

          await this.sendNotificationByChannel(preference, notificationData, 'expiration_warning');

        } catch (error) {
          this.logger.error(`Failed to send expiration warning for release ${release.id}:`, error);
        }
      }
    }
  }

  /**
   * Create and execute custom campaign
   */
  async createCampaign(template: CampaignTemplate, eventId: string): Promise<{
    campaignId: string;
    targetedUsers: number;
    scheduledNotifications: number;
  }> {
    this.logger.log(`Creating campaign ${template.name} for event ${eventId}`);

    const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get targeted users based on template criteria
    const targetedEntries = await this.getTargetedEntries(eventId, template.targeting);
    
    let scheduledNotifications = 0;

    for (const entry of targetedEntries) {
      const preferences = entry.notificationPreferences.filter(p => 
        p.enabled && template.channels.includes(p.channel)
      );

      for (const preference of preferences) {
        const delay = this.calculateNotificationDelay(template.scheduling, preference);
        
        const notificationData = {
          campaignId,
          templateId: template.id,
          userId: entry.userId,
          eventId: entry.eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          position: entry.position,
          waitTime: entry.waitingDays,
          customContent: template.content,
        };

        await this.scheduleNotification(preference.channel, notificationData, delay);
        scheduledNotifications++;
      }
    }

    return {
      campaignId,
      targetedUsers: targetedEntries.length,
      scheduledNotifications,
    };
  }

  /**
   * Send bulk notifications to specific users
   */
  async sendBulkNotifications(data: {
    eventId: string;
    userIds: string[];
    template: CampaignTemplate;
    immediate?: boolean;
  }): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: any[];
  }> {
    this.logger.log(`Sending bulk notifications to ${data.userIds.length} users`);

    const entries = await this.waitlistRepository.find({
      where: { 
        eventId: data.eventId, 
        userId: In(data.userIds),
        status: WaitlistStatus.ACTIVE,
      },
      relations: ['user', 'notificationPreferences'],
    });

    let sent = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const entry of entries) {
      try {
        const preferences = entry.notificationPreferences.filter(p => 
          p.enabled && data.template.channels.includes(p.channel)
        );

        for (const preference of preferences) {
          const notificationData = {
            userId: entry.userId,
            eventId: entry.eventId,
            userEmail: entry.user.email,
            userName: `${entry.user.firstName} ${entry.user.lastName}`,
            position: entry.position,
            customContent: data.template.content,
          };

          if (data.immediate) {
            await this.sendNotificationByChannel(preference, notificationData, 'bulk');
          } else {
            const delay = this.calculateNotificationDelay(data.template.scheduling, preference);
            await this.scheduleNotification(preference.channel, notificationData, delay);
          }
        }
        
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          userId: entry.userId,
          error: error.message,
        });
      }
    }

    return {
      success: failed === 0,
      sent,
      failed,
      errors,
    };
  }

  /**
   * Get campaign templates
   */
  getCampaignTemplates(): CampaignTemplate[] {
    return [
      {
        id: 'position-update',
        name: 'Position Update',
        type: 'position_update',
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
        content: {
          subject: 'Your waitlist position has been updated',
          emailTemplate: 'position-update-email',
          pushTitle: 'Waitlist Update',
          pushBody: 'You\'re now #{{position}} in line for {{eventName}}',
          variables: ['position', 'eventName', 'estimatedWaitTime'],
        },
        targeting: {
          priorities: ['standard', 'vip'],
        },
        scheduling: {
          immediate: false,
          delay: 5,
          quietHours: true,
        },
      },
      {
        id: 'price-drop-alert',
        name: 'Price Drop Alert',
        type: 'price_drop',
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
        content: {
          subject: 'Price drop for {{eventName}}!',
          emailTemplate: 'price-drop-email',
          smsTemplate: 'Price drop for {{eventName}}! Now ${{newPrice}}. Join waitlist: {{link}}',
          pushTitle: 'Price Drop Alert',
          pushBody: '{{eventName}} tickets now ${{newPrice}}',
          variables: ['eventName', 'newPrice', 'originalPrice', 'savings'],
        },
        targeting: {
          priceRange: { min: 0, max: 1000 },
        },
        scheduling: {
          immediate: true,
          quietHours: false,
        },
      },
      {
        id: 'final-warning',
        name: 'Final Warning',
        type: 'custom',
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
        content: {
          subject: 'Last chance: Your ticket offer expires soon!',
          emailTemplate: 'final-warning-email',
          smsTemplate: 'URGENT: Your {{eventName}} ticket offer expires in {{timeRemaining}}! Act now: {{link}}',
          pushTitle: 'Urgent: Ticket Offer Expiring',
          pushBody: 'Your offer expires in {{timeRemaining}}',
          variables: ['eventName', 'timeRemaining', 'offerPrice'],
        },
        targeting: {},
        scheduling: {
          immediate: true,
          quietHours: false,
        },
      },
    ];
  }

  /**
   * Scheduled job for automated campaigns
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async runAutomatedCampaigns(): Promise<void> {
    this.logger.log('Running automated notification campaigns');

    await Promise.all([
      this.sendExpirationWarnings(),
      this.sendPositionUpdateReminders(),
      this.sendEngagementReminders(),
    ]);
  }

  // Private helper methods

  private async shouldSendNotification(
    preference: WaitlistNotificationPreference,
    entry: IntelligentWaitlistEntry
  ): Promise<boolean> {
    // Check quiet hours
    if (preference.quietHours?.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(preference.quietHours.startTime?.split(':')[0] || '22');
      const endHour = parseInt(preference.quietHours.endTime?.split(':')[0] || '8');
      
      if (currentHour >= startHour || currentHour <= endHour) {
        return false;
      }
    }

    // Check timing preferences
    if (preference.timing === NotificationTiming.CUSTOM && preference.customDelayMinutes) {
      const lastNotification = entry.lastNotificationAt;
      if (lastNotification) {
        const timeSince = Date.now() - lastNotification.getTime();
        const requiredDelay = preference.customDelayMinutes * 60 * 1000;
        if (timeSince < requiredDelay) {
          return false;
        }
      }
    }

    return true;
  }

  private async sendNotificationByChannel(
    preference: WaitlistNotificationPreference,
    data: any,
    type: string = 'ticket_available'
  ): Promise<void> {
    const delay = this.calculateNotificationDelay({ immediate: true }, preference);

    switch (preference.channel) {
      case NotificationChannel.EMAIL:
        await this.emailQueue.add('send-waitlist-email', {
          ...data,
          type,
          template: this.getEmailTemplate(type),
          config: preference.channelConfig?.email,
        }, { delay });
        break;

      case NotificationChannel.SMS:
        await this.smsQueue.add('send-waitlist-sms', {
          ...data,
          type,
          phoneNumber: preference.channelConfig?.sms?.phoneNumber,
          template: this.getSmsTemplate(type),
        }, { delay });
        break;

      case NotificationChannel.PUSH:
        await this.pushQueue.add('send-waitlist-push', {
          ...data,
          type,
          deviceTokens: preference.channelConfig?.push?.deviceTokens,
          config: preference.channelConfig?.push,
        }, { delay });
        break;

      case NotificationChannel.IN_APP:
        // Handle in-app notifications
        break;
    }
  }

  private async scheduleNotification(
    channel: NotificationChannel,
    data: any,
    delay: number
  ): Promise<void> {
    const queueMap = {
      [NotificationChannel.EMAIL]: this.emailQueue,
      [NotificationChannel.SMS]: this.smsQueue,
      [NotificationChannel.PUSH]: this.pushQueue,
    };

    const queue = queueMap[channel];
    if (queue) {
      await queue.add(`send-${channel}-notification`, data, { delay });
    }
  }

  private calculateNotificationDelay(
    scheduling: any,
    preference: WaitlistNotificationPreference
  ): number {
    if (scheduling.immediate) return 0;
    
    let delay = scheduling.delay || 0; // minutes
    
    if (preference.timing === NotificationTiming.CUSTOM && preference.customDelayMinutes) {
      delay = preference.customDelayMinutes;
    }
    
    return delay * 60 * 1000; // Convert to milliseconds
  }

  private async getTargetedEntries(
    eventId: string,
    targeting: any
  ): Promise<IntelligentWaitlistEntry[]> {
    const queryBuilder = this.waitlistRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.notificationPreferences', 'preferences')
      .where('entry.eventId = :eventId', { eventId })
      .andWhere('entry.status = :status', { status: WaitlistStatus.ACTIVE });

    if (targeting.priorities?.length) {
      queryBuilder.andWhere('entry.priority IN (:...priorities)', { 
        priorities: targeting.priorities 
      });
    }

    if (targeting.positions) {
      if (targeting.positions.min) {
        queryBuilder.andWhere('entry.position >= :minPosition', { 
          minPosition: targeting.positions.min 
        });
      }
      if (targeting.positions.max) {
        queryBuilder.andWhere('entry.position <= :maxPosition', { 
          maxPosition: targeting.positions.max 
        });
      }
    }

    if (targeting.priceRange) {
      if (targeting.priceRange.min) {
        queryBuilder.andWhere('entry.maxPriceWilling >= :minPrice', { 
          minPrice: targeting.priceRange.min 
        });
      }
      if (targeting.priceRange.max) {
        queryBuilder.andWhere('entry.maxPriceWilling <= :maxPrice', { 
          maxPrice: targeting.priceRange.max 
        });
      }
    }

    return await queryBuilder.getMany();
  }

  private getEmailTemplate(type: string): string {
    const templates = {
      ticket_available: 'waitlist-ticket-available',
      position_update: 'waitlist-position-update',
      expiration_warning: 'waitlist-expiration-warning',
      bulk: 'waitlist-bulk-notification',
    };
    return templates[type] || 'waitlist-default';
  }

  private getSmsTemplate(type: string): string {
    const templates = {
      ticket_available: 'Tickets available for {{eventName}}! You have {{timeRemaining}} hours to purchase. {{link}}',
      position_update: 'Waitlist update: You\'re now #{{position}} for {{eventName}}. Estimated wait: {{estimatedWaitTime}} hours.',
      expiration_warning: 'URGENT: Your {{eventName}} ticket offer expires in {{timeRemaining}}! Purchase now: {{link}}',
      bulk: '{{customContent.smsTemplate}}',
    };
    return templates[type] || 'Waitlist notification for {{eventName}}';
  }

  private async sendPositionUpdateReminders(): Promise<void> {
    // Implementation for position update reminders
  }

  private async sendEngagementReminders(): Promise<void> {
    // Implementation for engagement reminders
  }
}
