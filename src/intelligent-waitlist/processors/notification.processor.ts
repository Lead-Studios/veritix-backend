import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationCampaignService } from '../services/notification-campaign.service';
import { IntelligentWaitlistEntry } from '../entities/waitlist-entry.entity';
import { WaitlistTicketRelease } from '../entities/waitlist-ticket-release.entity';
import { WaitlistNotificationPreference, NotificationChannel } from '../entities/waitlist-notification-preference.entity';

@Processor('waitlist-notifications')
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly campaignService: NotificationCampaignService,
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(WaitlistNotificationPreference)
    private preferencesRepository: Repository<WaitlistNotificationPreference>,
  ) {}

  /**
   * Send ticket available notification
   */
  @Process('send-ticket-available')
  async sendTicketAvailable(job: Job<{
    releaseId: string;
    userId: string;
    eventId: string;
  }>): Promise<void> {
    const { releaseId } = job.data;
    
    this.logger.log(`Sending ticket available notification for release ${releaseId}`);
    
    try {
      const result = await this.campaignService.sendTicketAvailableNotification(releaseId);
      
      if (result.success) {
        this.logger.log(`Ticket notification sent successfully via channels: ${result.sentChannels.join(', ')}`);
      } else {
        this.logger.warn(`Ticket notification partially failed. Errors: ${JSON.stringify(result.errors)}`);
      }
      
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send ticket available notification for release ${releaseId}:`, error);
      throw error;
    }
  }

  /**
   * Send VIP upgrade notification
   */
  @Process('send-vip-upgrade-notification')
  async sendVipUpgradeNotification(job: Job<{
    userId: string;
    eventId: string;
    oldPosition: number;
    newPosition: number;
    positionsSkipped: number;
    tier: string;
    benefits: string[];
  }>): Promise<void> {
    const { userId, eventId, oldPosition, newPosition, positionsSkipped, tier, benefits } = job.data;
    
    this.logger.log(`Sending VIP upgrade notification to user ${userId}`);
    
    try {
      const entry = await this.waitlistRepository.findOne({
        where: { userId, eventId },
        relations: ['user', 'notificationPreferences'],
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      const preferences = entry.notificationPreferences.filter(p => p.enabled);
      
      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          oldPosition,
          newPosition,
          positionsSkipped,
          tier,
          benefits: benefits.join(', '),
        };

        await this.sendNotificationByChannel(preference, notificationData, 'vip_upgrade');
      }

      this.logger.log(`VIP upgrade notification sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send VIP upgrade notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send position update notification
   */
  @Process('send-position-update')
  async sendPositionUpdate(job: Job<{
    userId: string;
    eventId: string;
    oldPosition: number;
    newPosition: number;
    estimatedWaitTime: number;
  }>): Promise<void> {
    const { userId, eventId, oldPosition, newPosition, estimatedWaitTime } = job.data;
    
    this.logger.log(`Sending position update notification to user ${userId}`);
    
    try {
      const entry = await this.waitlistRepository.findOne({
        where: { userId, eventId },
        relations: ['user', 'notificationPreferences'],
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      const preferences = entry.notificationPreferences.filter(p => 
        p.enabled && p.notificationTypes?.positionUpdate
      );

      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          oldPosition,
          newPosition,
          positionChange: oldPosition - newPosition,
          estimatedWaitTime,
          totalAhead: newPosition - 1,
        };

        await this.sendNotificationByChannel(preference, notificationData, 'position_update');
      }

      // Update last notification timestamp
      await this.waitlistRepository.update(entry.id, {
        lastNotificationAt: new Date(),
      });

      this.logger.log(`Position update notification sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send position update notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome notification for new waitlist joiners
   */
  @Process('send-welcome-notification')
  async sendWelcomeNotification(job: Job<{
    userId: string;
    eventId: string;
    entryId: string;
  }>): Promise<void> {
    const { userId, eventId, entryId } = job.data;
    
    this.logger.log(`Sending welcome notification to user ${userId}`);
    
    try {
      const entry = await this.waitlistRepository.findOne({
        where: { id: entryId },
        relations: ['user', 'event', 'notificationPreferences'],
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      const preferences = entry.notificationPreferences.filter(p => p.enabled);
      
      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          eventName: entry.event.name,
          position: entry.position,
          estimatedWaitTime: entry.estimatedWaitTime,
          totalWaiting: await this.getTotalWaitingCount(eventId),
        };

        await this.sendNotificationByChannel(preference, notificationData, 'welcome');
      }

      this.logger.log(`Welcome notification sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send welcome notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send removal notification
   */
  @Process('send-removal-notification')
  async sendRemovalNotification(job: Job<{
    userId: string;
    eventId: string;
    reason: string;
  }>): Promise<void> {
    const { userId, eventId, reason } = job.data;
    
    this.logger.log(`Sending removal notification to user ${userId}`);
    
    try {
      const user = await this.getUserById(userId);
      const event = await this.getEventById(eventId);

      if (!user || !event) {
        throw new Error('User or event not found');
      }

      // Send basic email notification for removal
      const notificationData = {
        userId,
        eventId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        eventName: event.name,
        reason,
        removalDate: new Date(),
      };

      // Send via email by default for removal notifications
      await this.sendEmailNotification(notificationData, 'removal');

      this.logger.log(`Removal notification sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send removal notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send VIP ticket offer notification
   */
  @Process('send-vip-ticket-offer')
  async sendVipTicketOffer(job: Job<{
    releaseId: string;
    userId: string;
    eventId: string;
    vipTier: string;
    benefits: any;
  }>): Promise<void> {
    const { releaseId, userId, eventId, vipTier, benefits } = job.data;
    
    this.logger.log(`Sending VIP ticket offer to user ${userId}`);
    
    try {
      const release = await this.releaseRepository.findOne({
        where: { id: releaseId },
        relations: ['waitlistEntry', 'waitlistEntry.user', 'waitlistEntry.notificationPreferences', 'event'],
      });

      if (!release) {
        throw new Error('Ticket release not found');
      }

      const preferences = release.waitlistEntry.notificationPreferences.filter(p => p.enabled);
      
      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          releaseId,
          userEmail: release.waitlistEntry.user.email,
          userName: `${release.waitlistEntry.user.firstName} ${release.waitlistEntry.user.lastName}`,
          eventName: release.event.name,
          vipTier,
          benefits: this.formatVipBenefits(benefits),
          ticketQuantity: release.ticketQuantity,
          offerPrice: release.offerPrice,
          expiresAt: release.expiresAt,
          timeRemaining: this.calculateTimeRemaining(release.expiresAt),
        };

        await this.sendNotificationByChannel(preference, notificationData, 'vip_ticket_offer');
      }

      // Update release with notification details
      await this.releaseRepository.update(releaseId, {
        notificationDetails: {
          sentAt: new Date(),
          channels: preferences.map(p => p.channel),
          deliveryStatus: 'sent',
          vipNotification: true,
        },
      });

      this.logger.log(`VIP ticket offer sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send VIP ticket offer to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send immediate VIP offer notification
   */
  @Process('send-immediate-vip-offer')
  async sendImmediateVipOffer(job: Job<{
    userId: string;
    eventId: string;
  }>): Promise<void> {
    const { userId, eventId } = job.data;
    
    this.logger.log(`Sending immediate VIP offer to user ${userId}`);
    
    try {
      const entry = await this.waitlistRepository.findOne({
        where: { userId, eventId },
        relations: ['user', 'event', 'notificationPreferences'],
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      const preferences = entry.notificationPreferences.filter(p => p.enabled);
      
      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          eventName: entry.event.name,
          position: entry.position,
          vipStatus: true,
          immediateOffer: true,
        };

        await this.sendNotificationByChannel(preference, notificationData, 'immediate_vip_offer');
      }

      this.logger.log(`Immediate VIP offer sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send immediate VIP offer to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send concierge introduction notification
   */
  @Process('send-concierge-introduction')
  async sendConciergeIntroduction(job: Job<{
    userId: string;
    eventId: string;
    conciergeId: string;
  }>): Promise<void> {
    const { userId, eventId, conciergeId } = job.data;
    
    this.logger.log(`Sending concierge introduction to user ${userId}`);
    
    try {
      const entry = await this.waitlistRepository.findOne({
        where: { userId, eventId },
        relations: ['user', 'event', 'notificationPreferences'],
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      const preferences = entry.notificationPreferences.filter(p => p.enabled);
      const conciergeInfo = await this.getConciergeInfo(conciergeId);
      
      for (const preference of preferences) {
        const notificationData = {
          userId,
          eventId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          eventName: entry.event.name,
          conciergeName: conciergeInfo.name,
          conciergeContact: conciergeInfo.contact,
          conciergeAvailability: conciergeInfo.availability,
        };

        await this.sendNotificationByChannel(preference, notificationData, 'concierge_introduction');
      }

      this.logger.log(`Concierge introduction sent to user ${userId}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to send concierge introduction to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process bulk notification sending
   */
  @Process('send-bulk-notifications')
  async sendBulkNotifications(job: Job<{
    notifications: Array<{
      userId: string;
      eventId: string;
      template: string;
      data: any;
    }>;
  }>): Promise<void> {
    const { notifications } = job.data;
    
    this.logger.log(`Processing ${notifications.length} bulk notifications`);
    
    try {
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < notifications.length; i++) {
        const notification = notifications[i];
        
        try {
          const entry = await this.waitlistRepository.findOne({
            where: { userId: notification.userId, eventId: notification.eventId },
            relations: ['user', 'notificationPreferences'],
          });

          if (entry) {
            const preferences = entry.notificationPreferences.filter(p => p.enabled);
            
            for (const preference of preferences) {
              await this.sendNotificationByChannel(
                preference, 
                { ...notification.data, userEmail: entry.user.email }, 
                notification.template
              );
            }
            sent++;
          }
        } catch (error) {
          this.logger.error(`Failed to send bulk notification to user ${notification.userId}:`, error);
          failed++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / notifications.length) * 100);
        await job.progress(progress);
      }

      this.logger.log(`Bulk notifications completed: ${sent} sent, ${failed} failed`);
    } catch (error) {
      this.logger.error('Failed to process bulk notifications:', error);
      throw error;
    }
  }

  // Private helper methods

  private async sendNotificationByChannel(
    preference: WaitlistNotificationPreference,
    data: any,
    template: string
  ): Promise<void> {
    switch (preference.channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(data, template);
        break;
      case NotificationChannel.SMS:
        await this.sendSmsNotification(data, template);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(data, template);
        break;
      case NotificationChannel.IN_APP:
        await this.sendInAppNotification(data, template);
        break;
    }
  }

  private async sendEmailNotification(data: any, template: string): Promise<void> {
    // Implementation would integrate with email service
    this.logger.log(`Sending email notification: ${template} to ${data.userEmail}`);
  }

  private async sendSmsNotification(data: any, template: string): Promise<void> {
    // Implementation would integrate with SMS service
    this.logger.log(`Sending SMS notification: ${template} to user ${data.userId}`);
  }

  private async sendPushNotification(data: any, template: string): Promise<void> {
    // Implementation would integrate with push notification service
    this.logger.log(`Sending push notification: ${template} to user ${data.userId}`);
  }

  private async sendInAppNotification(data: any, template: string): Promise<void> {
    // Implementation would create in-app notification
    this.logger.log(`Creating in-app notification: ${template} for user ${data.userId}`);
  }

  private async getTotalWaitingCount(eventId: string): Promise<number> {
    return await this.waitlistRepository.count({
      where: { eventId, status: 'ACTIVE' as any },
    });
  }

  private async getUserById(userId: string): Promise<any> {
    // Implementation would fetch user from user service
    return { id: userId, email: 'user@example.com', firstName: 'User', lastName: 'Name' };
  }

  private async getEventById(eventId: string): Promise<any> {
    // Implementation would fetch event from event service
    return { id: eventId, name: 'Event Name' };
  }

  private formatVipBenefits(benefits: any): string {
    if (!benefits) return '';
    
    const benefitStrings = [];
    if (benefits.skipAheadPositions) benefitStrings.push(`Skip ${benefits.skipAheadPositions} positions`);
    if (benefits.priceDiscount) benefitStrings.push(`${benefits.priceDiscount}% discount`);
    if (benefits.extendedOfferTime) benefitStrings.push(`${benefits.extendedOfferTime}h to respond`);
    if (benefits.personalizedService) benefitStrings.push('Personal concierge');
    if (benefits.exclusiveSeating) benefitStrings.push('Exclusive seating access');
    
    return benefitStrings.join(', ');
  }

  private calculateTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async getConciergeInfo(conciergeId: string): Promise<any> {
    // Implementation would fetch concierge information
    return {
      name: 'VIP Concierge',
      contact: 'concierge@veritix.com',
      availability: '24/7',
    };
  }
}
