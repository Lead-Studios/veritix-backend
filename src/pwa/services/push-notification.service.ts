import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PWASubscription, SubscriptionStatus } from '../entities/pwa-subscription.entity';
import { PushNotification, NotificationType, NotificationStatus, NotificationPriority } from '../entities/push-notification.entity';
import { PWAAnalytics, PWAEventType } from '../entities/pwa-analytics.entity';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  clickAction?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(PWASubscription)
    private subscriptionRepository: Repository<PWASubscription>,
    @InjectRepository(PushNotification)
    private notificationRepository: Repository<PushNotification>,
    @InjectRepository(PWAAnalytics)
    private analyticsRepository: Repository<PWAAnalytics>,
    private configService: ConfigService,
  ) {
    this.initializeWebPush();
  }

  private initializeWebPush(): void {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail = this.configService.get<string>('VAPID_EMAIL');

    if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
      webpush.setVapidDetails(
        `mailto:${vapidEmail}`,
        vapidPublicKey,
        vapidPrivateKey,
      );
    }
  }

  async subscribe(
    userId: string,
    endpoint: string,
    keys: { p256dh: string; auth: string },
    userAgent?: string,
    deviceInfo?: Record<string, any>,
  ): Promise<PWASubscription> {
    // Check if subscription already exists
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint },
    });

    if (existing) {
      // Update existing subscription
      await this.subscriptionRepository.update(existing.id, {
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        status: SubscriptionStatus.ACTIVE,
        lastUsed: new Date(),
        deviceInfo: deviceInfo || {},
        userAgent,
      });
      return this.subscriptionRepository.findOne({ where: { id: existing.id } });
    }

    // Create new subscription
    const newSubscription = this.subscriptionRepository.create({
      userId,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
      status: SubscriptionStatus.ACTIVE,
      lastUsed: new Date(),
      deviceInfo: deviceInfo || {},
      userAgent,
    });

    const saved = await this.subscriptionRepository.save(newSubscription);

    // Track subscription analytics
    await this.trackAnalytics(userId, PWAEventType.APP_INSTALL, {
      subscriptionId: saved.id,
      deviceInfo: deviceInfo?.deviceName || 'Unknown',
    });

    return saved;
  }

  async unsubscribeUser(userId: string, endpoint?: string): Promise<void> {
    const query = this.subscriptionRepository.createQueryBuilder()
      .update(PWASubscription)
      .set({ status: SubscriptionStatus.REVOKED })
      .where('userId = :userId', { userId });

    if (endpoint) {
      query.andWhere('endpoint = :endpoint', { endpoint });
    }

    await query.execute();
  }

  async sendNotification(
    userId: string | string[],
    payload: NotificationPayload,
    type: NotificationType,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    scheduledFor?: Date,
    eventId?: string,
  ): Promise<PushNotification[]> {
    const userIds = Array.isArray(userId) ? userId : [userId];
    const notifications: PushNotification[] = [];

    for (const uid of userIds) {
      const notification = this.notificationRepository.create({
        userId: uid,
        eventId,
        type,
        status: scheduledFor ? NotificationStatus.PENDING : NotificationStatus.PENDING,
        priority,
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        image: payload.image,
        clickAction: payload.clickAction,
        data: payload.data,
        actions: payload.actions,
        scheduledFor,
      });

      const saved = await this.notificationRepository.save(notification);
      notifications.push(saved);

      if (!scheduledFor) {
        // Send immediately
        await this.deliverNotification(saved.id);
      }
    }

    return notifications;
  }

  async deliverNotification(notificationId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`);
      return false;
    }

    // Get active subscriptions for user
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        userId: notification.userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (subscriptions.length === 0) {
      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: 'No active subscriptions found',
      });
      return false;
    }

    let deliverySuccess = false;
    const deliveryPromises = subscriptions.map(async (subscription) => {
      try {
        const pushPayload = {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: notification.badge || '/icons/badge-72x72.png',
          image: notification.image,
          data: {
            ...notification.data,
            notificationId: notification.id,
            timestamp: Date.now(),
          },
          actions: notification.actions,
          tag: `${notification.type}-${notification.eventId || 'system'}`,
          requireInteraction: notification.priority === NotificationPriority.URGENT,
        };

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          },
          JSON.stringify(pushPayload),
          {
            TTL: 86400, // 24 hours
            urgency: this.mapPriorityToUrgency(notification.priority),
          },
        );

        // Update subscription last used
        await this.subscriptionRepository.update(subscription.id, {
          lastUsed: new Date(),
        });

        deliverySuccess = true;
        this.logger.log(`Notification delivered: ${notificationId} to ${subscription.endpoint}`);

        // Track delivery analytics
        await this.trackAnalytics(notification.userId, PWAEventType.PUSH_NOTIFICATION_RECEIVED, {
          notificationId: notification.id,
          type: notification.type,
          subscriptionId: subscription.id,
        });

      } catch (error) {
        this.logger.error(`Failed to deliver notification to ${subscription.endpoint}:`, error);

        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid
          await this.subscriptionRepository.update(subscription.id, {
            status: SubscriptionStatus.EXPIRED,
          });
        }
      }
    });

    await Promise.allSettled(deliveryPromises);

    // Update notification status
    await this.notificationRepository.update(notificationId, {
      status: deliverySuccess ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: deliverySuccess ? new Date() : null,
      errorMessage: deliverySuccess ? null : 'Failed to deliver to any subscription',
    });

    return deliverySuccess;
  }

  async sendBulkNotifications(
    userIds: string[],
    payload: NotificationPayload,
    type: NotificationType,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    eventId?: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const notifications = await this.sendNotification(
        batch,
        payload,
        type,
        priority,
        undefined,
        eventId,
      );

      const deliveryResults = await Promise.allSettled(
        notifications.map(n => this.deliverNotification(n.id))
      );

      deliveryResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        } else {
          failed++;
        }
      });
    }

    return { sent, failed };
  }

  async scheduleNotification(
    userId: string,
    payload: NotificationPayload,
    type: NotificationType,
    scheduledFor: Date,
    eventId?: string,
  ): Promise<PushNotification> {
    const notifications = await this.sendNotification(
      userId,
      payload,
      type,
      NotificationPriority.NORMAL,
      scheduledFor,
      eventId,
    );

    return notifications[0];
  }

  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const scheduledNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: { $lte: now } as any,
      },
      take: 100,
    });

    const deliveryPromises = scheduledNotifications.map(notification =>
      this.deliverNotification(notification.id)
    );

    await Promise.allSettled(deliveryPromises);
  }

  async trackNotificationClick(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, {
      status: NotificationStatus.CLICKED,
      clickedAt: new Date(),
    });

    // Track click analytics
    await this.trackAnalytics(userId, PWAEventType.PUSH_NOTIFICATION_CLICKED, {
      notificationId,
    });
  }

  async getUserSubscriptions(userId: string): Promise<PWASubscription[]> {
    return this.subscriptionRepository.find({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      order: { lastUsed: 'DESC' },
    });
  }

  async updateSubscriptionPreferences(
    subscriptionId: string,
    preferences: PWASubscription['preferences'],
  ): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      preferences,
    });
  }

  async getNotificationHistory(
    userId: string,
    limit = 50,
    type?: NotificationType,
  ): Promise<PushNotification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .limit(limit);

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    return query.getMany();
  }

  async getNotificationMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, any>> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (startDate) {
      query.andWhere('notification.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('notification.createdAt <= :endDate', { endDate });
    }

    const [total, delivered, failed, clicked] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('notification.status = :status', { status: 'delivered' }).getCount(),
      query.clone().andWhere('notification.status = :status', { status: 'failed' }).getCount(),
      query.clone().andWhere('notification.clickedAt IS NOT NULL').getCount(),
    ]);

    return {
      total,
      delivered,
      failed,
      clicked,
      deliveryRate: total > 0 ? delivered / total : 0,
      clickRate: delivered > 0 ? clicked / delivered : 0,
      failureRate: total > 0 ? failed / total : 0,
    };
  }

  async getNotifications(filter: {
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PushNotification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (filter.status) {
      query.andWhere('notification.status = :status', { status: filter.status });
    }

    if (filter.userId) {
      query.andWhere('notification.userId = :userId', { userId: filter.userId });
    }

    return query
      .orderBy('notification.createdAt', 'DESC')
      .limit(filter.limit || 50)
      .offset(filter.offset || 0)
      .getMany();
  }

  async getNotificationAnalytics(startDate?: Date, endDate?: Date): Promise<Record<string, any>> {
    return this.getNotificationMetrics(startDate, endDate);
  }

  async getAllSubscriptions(filter: {
    isActive?: boolean;
    deviceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<PWASubscription[]> {
    const query = this.subscriptionRepository.createQueryBuilder('subscription');

    if (filter.isActive !== undefined) {
      query.andWhere('subscription.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.deviceType) {
      query.andWhere('subscription.deviceInfo->>\"type\" = :deviceType', { deviceType: filter.deviceType });
    }

    return query
      .orderBy('subscription.createdAt', 'DESC')
      .limit(filter.limit || 50)
      .offset(filter.offset || 0)
      .getMany();
  }

  private mapPriorityToUrgency(priority: NotificationPriority): string {
    const mapping = {
      [NotificationPriority.LOW]: 'low',
      [NotificationPriority.NORMAL]: 'normal',
      [NotificationPriority.HIGH]: 'high',
      [NotificationPriority.URGENT]: 'high',
    };
    return mapping[priority];
  }

  private async trackAnalytics(
    userId: string,
    eventType: PWAEventType,
    eventData?: Record<string, any>,
  ): Promise<void> {
    try {
      const analytics = this.analyticsRepository.create({
        userId,
        sessionId: `session-${Date.now()}`,
        eventType,
        eventData,
        isOnline: true,
      });

      await this.analyticsRepository.save(analytics);
    } catch (error) {
      this.logger.error('Failed to track analytics:', error);
    }
  }

  async cleanupExpiredSubscriptions(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.subscriptionRepository
      .createQueryBuilder()
      .update(PWASubscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('lastUsed < :date OR expiresAt < :now', {
        date: thirtyDaysAgo,
        now: new Date(),
      })
      .execute();
  }

  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: { $lt: 3 } as any,
      },
      take: 50,
    });

    const retryPromises = failedNotifications.map(async (notification) => {
      await this.notificationRepository.update(notification.id, {
        retryCount: notification.retryCount + 1,
      });

      return this.deliverNotification(notification.id);
    });

    await Promise.allSettled(retryPromises);
  }
}
