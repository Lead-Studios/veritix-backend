import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, LessThan, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistNotificationPreference, NotificationChannel } from '../entities/waitlist-notification-preference.entity';
import { WaitlistTicketRelease, ReleaseReason, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';
import { User } from 'src/user/entities/user.entity';
import { Event } from 'src/event/entities/event.entity';

@Injectable()
export class IntelligentWaitlistService {
  private readonly logger = new Logger(IntelligentWaitlistService.name);

  constructor(
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistNotificationPreference)
    private preferencesRepository: Repository<WaitlistNotificationPreference>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectQueue('waitlist-processing')
    private waitlistQueue: Queue,
    @InjectQueue('notification-delivery')
    private notificationQueue: Queue,
    private entityManager: EntityManager,
  ) {}

  /**
   * Join waitlist with enhanced features
   */
  async joinWaitlist(data: {
    userId: string;
    eventId: string;
    ticketQuantity?: number;
    maxPriceWilling?: number;
    seatPreferences?: any;
    priority?: WaitlistPriority;
    notificationPreferences?: any[];
    metadata?: any;
  }): Promise<IntelligentWaitlistEntry> {
    this.logger.log(`User ${data.userId} joining waitlist for event ${data.eventId}`);

    return await this.entityManager.transaction(async manager => {
      // Validate user and event
      const user = await manager.findOne(User, { where: { id: data.userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const event = await manager.findOne(Event, { where: { id: data.eventId } });
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check for existing entry
      const existingEntry = await manager.findOne(IntelligentWaitlistEntry, {
        where: { userId: data.userId, eventId: data.eventId }
      });

      if (existingEntry) {
        throw new ConflictException('User already on waitlist for this event');
      }

      // Determine priority based on user profile
      const priority = await this.determinePriority(user, data.priority);

      // Calculate position
      const position = await this.calculateWaitlistPosition(data.eventId, priority, manager);

      // Create waitlist entry
      const waitlistEntry = manager.create(IntelligentWaitlistEntry, {
        userId: data.userId,
        eventId: data.eventId,
        priority,
        position,
        ticketQuantity: data.ticketQuantity || 1,
        maxPriceWilling: data.maxPriceWilling,
        seatPreferences: data.seatPreferences,
        metadata: {
          ...data.metadata,
          joinedAt: new Date(),
          source: data.metadata?.source || 'web',
        },
      });

      const savedEntry = await manager.save(waitlistEntry);

      // Create notification preferences
      if (data.notificationPreferences?.length) {
        for (const pref of data.notificationPreferences) {
          const preference = manager.create(WaitlistNotificationPreference, {
            waitlistEntryId: savedEntry.id,
            ...pref,
          });
          await manager.save(preference);
        }
      } else {
        // Create default preferences
        await this.createDefaultNotificationPreferences(savedEntry.id, manager);
      }

      // Update positions for other entries
      await this.recalculatePositions(data.eventId, manager);

      // Queue analytics update
      await this.waitlistQueue.add('update-analytics', {
        eventId: data.eventId,
        action: 'joined',
        priority,
      });

      this.logger.log(`User ${data.userId} joined waitlist at position ${position}`);
      return savedEntry;
    });
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(userId: string, eventId: string, reason?: string): Promise<void> {
    this.logger.log(`Removing user ${userId} from waitlist for event ${eventId}`);

    await this.entityManager.transaction(async manager => {
      const entry = await manager.findOne(IntelligentWaitlistEntry, {
        where: { userId, eventId, status: WaitlistStatus.ACTIVE }
      });

      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Update status instead of deleting for analytics
      await manager.update(IntelligentWaitlistEntry, entry.id, {
        status: WaitlistStatus.REMOVED,
        metadata: {
          ...entry.metadata,
          removedAt: new Date(),
          removeReason: reason,
        },
      });

      // Recalculate positions
      await this.recalculatePositions(eventId, manager);

      // Queue analytics update
      await this.waitlistQueue.add('update-analytics', {
        eventId,
        action: 'left',
        priority: entry.priority,
      });
    });
  }

  /**
   * Get enhanced waitlist position with estimated wait time
   */
  async getWaitlistPosition(userId: string, eventId: string): Promise<{
    position: number;
    totalAhead: number;
    estimatedWaitTime: number;
    priority: WaitlistPriority;
    ticketReleases: any[];
    nextNotificationEstimate: Date;
  }> {
    const entry = await this.waitlistRepository.findOne({
      where: { userId, eventId, status: WaitlistStatus.ACTIVE },
      relations: ['ticketReleases'],
    });

    if (!entry) {
      throw new NotFoundException('User not found on waitlist');
    }

    const totalAhead = await this.waitlistRepository.count({
      where: {
        eventId,
        status: WaitlistStatus.ACTIVE,
        position: LessThan(entry.position),
      },
    });

    const estimatedWaitTime = await this.calculateEstimatedWaitTime(entry);
    const nextNotificationEstimate = await this.estimateNextNotification(entry);

    return {
      position: entry.position,
      totalAhead,
      estimatedWaitTime,
      priority: entry.priority,
      ticketReleases: entry.ticketReleases || [],
      nextNotificationEstimate,
    };
  }

  /**
   * Automatic ticket release when cancellations occur
   */
  async processTicketRelease(data: {
    eventId: string;
    ticketQuantity: number;
    releaseReason: ReleaseReason;
    offerPrice: number;
    originalPrice?: number;
    ticketDetails?: any;
    offerDurationHours?: number;
  }): Promise<WaitlistTicketRelease[]> {
    this.logger.log(`Processing ticket release for event ${data.eventId}: ${data.ticketQuantity} tickets`);

    return await this.entityManager.transaction(async manager => {
      // Get eligible waitlist entries using smart algorithm
      const eligibleEntries = await this.getEligibleWaitlistEntries(
        data.eventId,
        data.ticketQuantity,
        data.offerPrice,
        manager
      );

      if (eligibleEntries.length === 0) {
        this.logger.log('No eligible waitlist entries found');
        return [];
      }

      const releases: WaitlistTicketRelease[] = [];
      let remainingTickets = data.ticketQuantity;

      for (const entry of eligibleEntries) {
        if (remainingTickets <= 0) break;

        const ticketsToOffer = Math.min(entry.ticketQuantity, remainingTickets);
        const expiresAt = new Date(Date.now() + (data.offerDurationHours || 24) * 60 * 60 * 1000);

        const release = manager.create(WaitlistTicketRelease, {
          waitlistEntryId: entry.id,
          eventId: data.eventId,
          ticketQuantity: ticketsToOffer,
          offerPrice: data.offerPrice,
          originalPrice: data.originalPrice,
          releaseReason: data.releaseReason,
          expiresAt,
          offerDurationHours: data.offerDurationHours || 24,
          ticketDetails: data.ticketDetails,
          metadata: {
            automatedRelease: true,
            batchId: `batch-${Date.now()}`,
            priority: this.getPriorityWeight(entry.priority),
          },
        });

        const savedRelease = await manager.save(release);
        releases.push(savedRelease);

        // Update waitlist entry status
        await manager.update(IntelligentWaitlistEntry, entry.id, {
          status: WaitlistStatus.NOTIFIED,
          notifiedAt: new Date(),
          notificationCount: entry.notificationCount + 1,
          lastNotificationAt: new Date(),
          notificationExpiresAt: expiresAt,
        });

        remainingTickets -= ticketsToOffer;

        // Queue notification
        await this.notificationQueue.add('send-ticket-offer', {
          releaseId: savedRelease.id,
          waitlistEntryId: entry.id,
          userId: entry.userId,
          priority: 'high',
        });
      }

      // Queue analytics update
      await this.waitlistQueue.add('update-analytics', {
        eventId: data.eventId,
        action: 'tickets_released',
        quantity: data.ticketQuantity - remainingTickets,
      });

      this.logger.log(`Created ${releases.length} ticket offers for event ${data.eventId}`);
      return releases;
    });
  }

  /**
   * Handle ticket offer response
   */
  async respondToTicketOffer(
    releaseId: string,
    userId: string,
    response: 'accept' | 'decline',
    declineReason?: string
  ): Promise<{ success: boolean; orderId?: string; message: string }> {
    this.logger.log(`User ${userId} responding to ticket offer ${releaseId}: ${response}`);

    return await this.entityManager.transaction(async manager => {
      const release = await manager.findOne(WaitlistTicketRelease, {
        where: { id: releaseId },
        relations: ['waitlistEntry', 'event'],
      });

      if (!release) {
        throw new NotFoundException('Ticket offer not found');
      }

      if (release.waitlistEntry.userId !== userId) {
        throw new BadRequestException('Unauthorized to respond to this offer');
      }

      if (release.status !== ReleaseStatus.OFFERED) {
        throw new BadRequestException('Offer is no longer available');
      }

      if (release.isExpired) {
        await manager.update(WaitlistTicketRelease, releaseId, {
          status: ReleaseStatus.EXPIRED,
        });
        throw new BadRequestException('Offer has expired');
      }

      if (response === 'accept') {
        // Process ticket purchase
        const orderId = await this.processTicketPurchase(release, manager);

        await manager.update(WaitlistTicketRelease, releaseId, {
          status: ReleaseStatus.ACCEPTED,
          acceptedAt: new Date(),
          resultingOrderId: orderId,
        });

        await manager.update(IntelligentWaitlistEntry, release.waitlistEntryId, {
          status: WaitlistStatus.CONVERTED,
          convertedAt: new Date(),
          convertedOrderId: orderId,
        });

        return {
          success: true,
          orderId,
          message: 'Ticket offer accepted and purchase completed',
        };
      } else {
        // Handle decline
        await manager.update(WaitlistTicketRelease, releaseId, {
          status: ReleaseStatus.DECLINED,
          declinedAt: new Date(),
          declineReason,
        });

        await manager.update(IntelligentWaitlistEntry, release.waitlistEntryId, {
          status: WaitlistStatus.ACTIVE,
          notifiedAt: null,
          notificationExpiresAt: null,
        });

        // Re-offer to next person in line
        await this.waitlistQueue.add('re-offer-tickets', {
          eventId: release.eventId,
          ticketQuantity: release.ticketQuantity,
          offerPrice: release.offerPrice,
          originalReleaseId: releaseId,
        });

        return {
          success: true,
          message: 'Ticket offer declined, offered to next person in line',
        };
      }
    });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    eventId: string,
    preferences: any[]
  ): Promise<WaitlistNotificationPreference[]> {
    const entry = await this.waitlistRepository.findOne({
      where: { userId, eventId, status: WaitlistStatus.ACTIVE }
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return await this.entityManager.transaction(async manager => {
      // Remove existing preferences
      await manager.delete(WaitlistNotificationPreference, {
        waitlistEntryId: entry.id,
      });

      // Create new preferences
      const savedPreferences: WaitlistNotificationPreference[] = [];
      for (const pref of preferences) {
        const preference = manager.create(WaitlistNotificationPreference, {
          waitlistEntryId: entry.id,
          ...pref,
        });
        const saved = await manager.save(preference);
        savedPreferences.push(saved);
      }

      return savedPreferences;
    });
  }

  /**
   * Bulk waitlist management
   */
  async bulkManageWaitlist(eventId: string, operations: {
    action: 'notify' | 'remove' | 'upgrade_priority' | 'move_position';
    userIds?: string[];
    criteria?: any;
    parameters?: any;
  }[]): Promise<{ success: boolean; processed: number; errors: any[] }> {
    this.logger.log(`Bulk managing waitlist for event ${eventId}`);

    let processed = 0;
    const errors: any[] = [];

    for (const operation of operations) {
      try {
        switch (operation.action) {
          case 'notify':
            await this.bulkNotifyUsers(eventId, operation.userIds, operation.parameters);
            break;
          case 'remove':
            await this.bulkRemoveUsers(eventId, operation.userIds, operation.parameters?.reason);
            break;
          case 'upgrade_priority':
            await this.bulkUpgradePriority(eventId, operation.userIds, operation.parameters?.newPriority);
            break;
          case 'move_position':
            await this.bulkMovePosition(eventId, operation.userIds, operation.parameters?.newPosition);
            break;
        }
        processed++;
      } catch (error) {
        errors.push({
          operation: operation.action,
          error: error.message,
        });
      }
    }

    return { success: errors.length === 0, processed, errors };
  }

  /**
   * Scheduled job to clean up expired offers
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOffers(): Promise<void> {
    this.logger.log('Cleaning up expired ticket offers');

    const expiredOffers = await this.releaseRepository.find({
      where: {
        status: ReleaseStatus.OFFERED,
        expiresAt: LessThan(new Date()),
      },
      relations: ['waitlistEntry'],
    });

    for (const offer of expiredOffers) {
      await this.entityManager.transaction(async manager => {
        await manager.update(WaitlistTicketRelease, offer.id, {
          status: ReleaseStatus.EXPIRED,
        });

        await manager.update(IntelligentWaitlistEntry, offer.waitlistEntryId, {
          status: WaitlistStatus.ACTIVE,
          notifiedAt: null,
          notificationExpiresAt: null,
        });

        // Re-offer to next person
        await this.waitlistQueue.add('re-offer-tickets', {
          eventId: offer.eventId,
          ticketQuantity: offer.ticketQuantity,
          offerPrice: offer.offerPrice,
          originalReleaseId: offer.id,
        });
      });
    }

    this.logger.log(`Cleaned up ${expiredOffers.length} expired offers`);
  }

  /**
   * Scheduled job to recalculate positions
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async recalculateAllPositions(): Promise<void> {
    this.logger.log('Recalculating all waitlist positions');

    const events = await this.eventRepository.find({
      where: { status: 'active' }, // Assuming events have a status field
    });

    for (const event of events) {
      await this.recalculatePositions(event.id);
    }

    this.logger.log('Completed position recalculation for all events');
  }

  // Private helper methods

  private async determinePriority(user: User, requestedPriority?: WaitlistPriority): Promise<WaitlistPriority> {
    // Logic to determine priority based on user profile, loyalty, etc.
    if (requestedPriority === WaitlistPriority.VIP) {
      // Check if user is eligible for VIP
      // This would integrate with your user/loyalty system
      return WaitlistPriority.VIP;
    }
    
    return WaitlistPriority.STANDARD;
  }

  private async calculateWaitlistPosition(
    eventId: string,
    priority: WaitlistPriority,
    manager: EntityManager
  ): Promise<number> {
    const count = await manager.count(IntelligentWaitlistEntry, {
      where: {
        eventId,
        status: WaitlistStatus.ACTIVE,
      },
    });

    // VIP and premium get better positions
    const priorityOffset = this.getPriorityOffset(priority);
    return Math.max(1, count + 1 - priorityOffset);
  }

  private getPriorityOffset(priority: WaitlistPriority): number {
    switch (priority) {
      case WaitlistPriority.VIP: return 1000;
      case WaitlistPriority.PREMIUM: return 500;
      case WaitlistPriority.LOYALTY: return 100;
      default: return 0;
    }
  }

  private getPriorityWeight(priority: WaitlistPriority): number {
    switch (priority) {
      case WaitlistPriority.VIP: return 4;
      case WaitlistPriority.PREMIUM: return 3;
      case WaitlistPriority.LOYALTY: return 2;
      default: return 1;
    }
  }

  private async recalculatePositions(eventId: string, manager?: EntityManager): Promise<void> {
    const em = manager || this.entityManager;
    
    const entries = await em.find(IntelligentWaitlistEntry, {
      where: { eventId, status: WaitlistStatus.ACTIVE },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    for (let i = 0; i < entries.length; i++) {
      await em.update(IntelligentWaitlistEntry, entries[i].id, {
        position: i + 1,
      });
    }
  }

  private async createDefaultNotificationPreferences(
    waitlistEntryId: string,
    manager: EntityManager
  ): Promise<void> {
    const defaultPreferences = [
      {
        channel: NotificationChannel.EMAIL,
        enabled: true,
        notificationTypes: {
          ticketAvailable: true,
          positionUpdate: false,
          reminderBeforeExpiry: true,
        },
      },
      {
        channel: NotificationChannel.PUSH,
        enabled: true,
        notificationTypes: {
          ticketAvailable: true,
          finalWarning: true,
        },
      },
    ];

    for (const pref of defaultPreferences) {
      const preference = manager.create(WaitlistNotificationPreference, {
        waitlistEntryId,
        ...pref,
      });
      await manager.save(preference);
    }
  }

  private async getEligibleWaitlistEntries(
    eventId: string,
    ticketQuantity: number,
    offerPrice: number,
    manager: EntityManager
  ): Promise<IntelligentWaitlistEntry[]> {
    return await manager.find(IntelligentWaitlistEntry, {
      where: {
        eventId,
        status: WaitlistStatus.ACTIVE,
        // Only include users willing to pay the offer price or haven't specified a max price
        maxPriceWilling: MoreThan(offerPrice) || null,
      },
      order: {
        priority: 'DESC',
        position: 'ASC',
      },
      take: ticketQuantity * 2, // Get more than needed for flexibility
    });
  }

  private async calculateEstimatedWaitTime(entry: IntelligentWaitlistEntry): Promise<number> {
    // This would use historical data and current conversion rates
    // For now, return a simple calculation
    const baseWaitTime = entry.position * 24; // hours
    const priorityMultiplier = this.getPriorityWeight(entry.priority);
    return Math.max(1, baseWaitTime / priorityMultiplier);
  }

  private async estimateNextNotification(entry: IntelligentWaitlistEntry): Promise<Date> {
    const estimatedHours = await this.calculateEstimatedWaitTime(entry);
    return new Date(Date.now() + estimatedHours * 60 * 60 * 1000);
  }

  private async processTicketPurchase(
    release: WaitlistTicketRelease,
    manager: EntityManager
  ): Promise<string> {
    // This would integrate with your ticket purchasing system
    // For now, return a mock order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Here you would:
    // 1. Create order in your order system
    // 2. Process payment
    // 3. Generate tickets
    // 4. Send confirmation
    
    return orderId;
  }

  private async bulkNotifyUsers(eventId: string, userIds: string[], parameters: any): Promise<void> {
    // Implementation for bulk notifications
    for (const userId of userIds) {
      await this.notificationQueue.add('send-bulk-notification', {
        userId,
        eventId,
        ...parameters,
      });
    }
  }

  private async bulkRemoveUsers(eventId: string, userIds: string[], reason: string): Promise<void> {
    await this.entityManager.update(
      IntelligentWaitlistEntry,
      { userId: In(userIds), eventId },
      { status: WaitlistStatus.REMOVED }
    );
  }

  private async bulkUpgradePriority(
    eventId: string,
    userIds: string[],
    newPriority: WaitlistPriority
  ): Promise<void> {
    await this.entityManager.update(
      IntelligentWaitlistEntry,
      { userId: In(userIds), eventId },
      { priority: newPriority }
    );
    
    await this.recalculatePositions(eventId);
  }

  private async bulkMovePosition(eventId: string, userIds: string[], newPosition: number): Promise<void> {
    // Complex logic to move users to specific positions
    // This would require careful position management
    await this.recalculatePositions(eventId);
  }
}
