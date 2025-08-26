import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistTicketRelease, ReleaseReason, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

export interface VipTier {
  id: string;
  name: string;
  priority: WaitlistPriority;
  benefits: {
    skipAheadPositions?: number;
    earlyAccess?: boolean;
    priceDiscount?: number;
    extendedOfferTime?: number;
    personalizedService?: boolean;
    exclusiveSeating?: boolean;
  };
  requirements: {
    minimumSpend?: number;
    membershipLevel?: string;
    eventHistory?: number;
    referralCount?: number;
  };
}

export interface VipUpgradeResult {
  success: boolean;
  newPriority: WaitlistPriority;
  newPosition: number;
  positionsSkipped: number;
  benefits: string[];
}

@Injectable()
export class VipPriorityService {
  private readonly logger = new Logger(VipPriorityService.name);

  private readonly vipTiers: VipTier[] = [
    {
      id: 'platinum',
      name: 'Platinum VIP',
      priority: WaitlistPriority.VIP,
      benefits: {
        skipAheadPositions: 50,
        earlyAccess: true,
        priceDiscount: 15,
        extendedOfferTime: 48,
        personalizedService: true,
        exclusiveSeating: true,
      },
      requirements: {
        minimumSpend: 5000,
        membershipLevel: 'platinum',
        eventHistory: 10,
      },
    },
    {
      id: 'gold',
      name: 'Gold VIP',
      priority: WaitlistPriority.PREMIUM,
      benefits: {
        skipAheadPositions: 25,
        earlyAccess: true,
        priceDiscount: 10,
        extendedOfferTime: 36,
        personalizedService: true,
      },
      requirements: {
        minimumSpend: 2000,
        membershipLevel: 'gold',
        eventHistory: 5,
      },
    },
    {
      id: 'silver',
      name: 'Silver VIP',
      priority: WaitlistPriority.PREMIUM,
      benefits: {
        skipAheadPositions: 10,
        priceDiscount: 5,
        extendedOfferTime: 24,
      },
      requirements: {
        minimumSpend: 500,
        membershipLevel: 'silver',
        eventHistory: 2,
      },
    },
  ];

  constructor(
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectQueue('waitlist-notifications')
    private notificationQueue: Queue,
    private entityManager: EntityManager,
  ) {}

  /**
   * Upgrade user to VIP status on waitlist
   */
  async upgradeToVip(
    userId: string,
    eventId: string,
    tierOrPriority: string | WaitlistPriority,
    reason?: string
  ): Promise<VipUpgradeResult> {
    this.logger.log(`Upgrading user ${userId} to VIP for event ${eventId}`);

    return await this.entityManager.transaction(async (manager) => {
      const entry = await manager.findOne(IntelligentWaitlistEntry, {
        where: { userId, eventId, status: WaitlistStatus.ACTIVE },
      });

      if (!entry) {
        throw new Error('Waitlist entry not found');
      }

      // Determine new priority and tier
      const { priority, tier } = this.resolvePriorityAndTier(tierOrPriority);
      const oldPosition = entry.position;
      const oldPriority = entry.priority;

      // Update entry with new priority
      await manager.update(IntelligentWaitlistEntry, entry.id, {
        priority,
        metadata: {
          ...entry.metadata,
          vipTier: tier?.id,
          upgradeReason: reason,
          upgradedAt: new Date(),
          previousPriority: oldPriority,
        },
      });

      // Recalculate positions for the entire event
      await this.recalculateEventPositions(eventId, manager);

      // Get updated entry
      const updatedEntry = await manager.findOne(IntelligentWaitlistEntry, {
        where: { id: entry.id },
      });

      const newPosition = updatedEntry.position;
      const positionsSkipped = Math.max(0, oldPosition - newPosition);
      const benefits = tier ? this.formatBenefits(tier.benefits) : [];

      // Send upgrade notification
      await this.notificationQueue.add('send-vip-upgrade-notification', {
        userId,
        eventId,
        oldPosition,
        newPosition,
        positionsSkipped,
        tier: tier?.name || priority,
        benefits,
      });

      // Check if immediate ticket offer is warranted
      await this.checkForImmediateOffer(updatedEntry, manager);

      return {
        success: true,
        newPriority: priority,
        newPosition,
        positionsSkipped,
        benefits,
      };
    });
  }

  /**
   * Automatically evaluate and upgrade eligible users
   */
  async evaluateVipEligibility(eventId: string): Promise<{
    evaluated: number;
    upgraded: number;
    upgrades: Array<{ userId: string; tier: string; reason: string }>;
  }> {
    this.logger.log(`Evaluating VIP eligibility for event ${eventId}`);

    const entries = await this.waitlistRepository.find({
      where: { 
        eventId, 
        status: WaitlistStatus.ACTIVE,
        priority: WaitlistPriority.STANDARD, // Only evaluate standard users
      },
      relations: ['user'],
    });

    let upgraded = 0;
    const upgrades: Array<{ userId: string; tier: string; reason: string }> = [];

    for (const entry of entries) {
      try {
        const eligibleTier = await this.checkUserEligibility(entry.user);
        
        if (eligibleTier && eligibleTier.priority !== entry.priority) {
          await this.upgradeToVip(
            entry.userId,
            eventId,
            eligibleTier.priority,
            `Auto-upgrade: Qualified for ${eligibleTier.name}`
          );

          upgraded++;
          upgrades.push({
            userId: entry.userId,
            tier: eligibleTier.name,
            reason: `Qualified based on ${this.getQualificationReason(entry.user, eligibleTier)}`,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate user ${entry.userId}:`, error);
      }
    }

    return {
      evaluated: entries.length,
      upgraded,
      upgrades,
    };
  }

  /**
   * Create VIP-only ticket releases
   */
  async createVipOnlyRelease(
    eventId: string,
    ticketQuantity: number,
    vipTiers: string[] = ['platinum', 'gold']
  ): Promise<{
    releasesCreated: number;
    vipsNotified: number;
  }> {
    this.logger.log(`Creating VIP-only release for event ${eventId}`);

    const targetPriorities = vipTiers.map(tier => {
      const vipTier = this.vipTiers.find(t => t.id === tier);
      return vipTier?.priority;
    }).filter(Boolean);

    const vipEntries = await this.waitlistRepository.find({
      where: {
        eventId,
        status: WaitlistStatus.ACTIVE,
        priority: In(targetPriorities),
      },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: ticketQuantity,
    });

    let releasesCreated = 0;
    let vipsNotified = 0;

    for (const entry of vipEntries) {
      try {
        const tier = this.getUserTier(entry);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (tier?.benefits.extendedOfferTime || 24));

        const release = await this.releaseRepository.save({
          userId: entry.userId,
          eventId: entry.eventId,
          waitlistEntryId: entry.id,
          ticketQuantity: entry.ticketQuantity || 1,
          offerPrice: await this.calculateVipPrice(entry, tier),
          expiresAt,
          releaseReason: ReleaseReason.VIP_PRIORITY,
          status: ReleaseStatus.OFFERED,
          metadata: {
            vipTier: tier?.id,
            vipOnly: true,
            benefits: tier?.benefits,
          },
        });

        await this.waitlistRepository.update(entry.id, {
          status: WaitlistStatus.NOTIFIED,
          lastNotificationAt: new Date(),
        });

        await this.notificationQueue.add('send-vip-ticket-offer', {
          releaseId: release.id,
          userId: entry.userId,
          eventId: entry.eventId,
          vipTier: tier?.name,
          benefits: tier?.benefits,
        });

        releasesCreated++;
        vipsNotified++;

      } catch (error) {
        this.logger.error(`Failed to create VIP release for entry ${entry.id}:`, error);
      }
    }

    return { releasesCreated, vipsNotified };
  }

  /**
   * Get VIP analytics and insights
   */
  async getVipAnalytics(eventId: string): Promise<{
    vipBreakdown: Record<string, number>;
    conversionRates: Record<string, number>;
    revenueImpact: Record<string, number>;
    averageWaitTimes: Record<string, number>;
    satisfactionMetrics: any;
  }> {
    const [vipBreakdown, conversionRates, revenueImpact, averageWaitTimes] = await Promise.all([
      this.getVipBreakdown(eventId),
      this.getVipConversionRates(eventId),
      this.getVipRevenueImpact(eventId),
      this.getVipAverageWaitTimes(eventId),
    ]);

    const satisfactionMetrics = await this.getVipSatisfactionMetrics(eventId);

    return {
      vipBreakdown,
      conversionRates,
      revenueImpact,
      averageWaitTimes,
      satisfactionMetrics,
    };
  }

  /**
   * Manage VIP concierge services
   */
  async assignConcierge(
    userId: string,
    eventId: string,
    conciergeId: string
  ): Promise<{
    success: boolean;
    conciergeContact: any;
  }> {
    const entry = await this.waitlistRepository.findOne({
      where: { userId, eventId },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const tier = this.getUserTier(entry);
    if (!tier?.benefits.personalizedService) {
      throw new Error('User not eligible for concierge service');
    }

    await this.waitlistRepository.update(entry.id, {
      metadata: {
        ...entry.metadata,
        conciergeId,
        conciergeAssignedAt: new Date(),
      },
    });

    // Send concierge introduction
    await this.notificationQueue.add('send-concierge-introduction', {
      userId,
      eventId,
      conciergeId,
    });

    return {
      success: true,
      conciergeContact: {
        id: conciergeId,
        // Additional concierge details would be fetched here
      },
    };
  }

  /**
   * Handle VIP seat preferences and exclusive access
   */
  async handleVipSeatPreferences(
    userId: string,
    eventId: string,
    preferences: any
  ): Promise<{
    success: boolean;
    exclusiveOptions: any[];
    guaranteedSeating: boolean;
  }> {
    const entry = await this.waitlistRepository.findOne({
      where: { userId, eventId },
      relations: ['user'],
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const tier = this.getUserTier(entry);
    const exclusiveOptions = tier?.benefits.exclusiveSeating 
      ? await this.getExclusiveSeatingOptions(eventId, tier)
      : [];

    await this.waitlistRepository.update(entry.id, {
      seatPreferences: {
        ...entry.seatPreferences,
        ...preferences,
        vipExclusive: tier?.benefits.exclusiveSeating || false,
      },
    });

    return {
      success: true,
      exclusiveOptions,
      guaranteedSeating: tier?.benefits.exclusiveSeating || false,
    };
  }

  // Private helper methods

  private resolvePriorityAndTier(tierOrPriority: string | WaitlistPriority): {
    priority: WaitlistPriority;
    tier?: VipTier;
  } {
    if (Object.values(WaitlistPriority).includes(tierOrPriority as WaitlistPriority)) {
      return { priority: tierOrPriority as WaitlistPriority };
    }

    const tier = this.vipTiers.find(t => t.id === tierOrPriority || t.name === tierOrPriority);
    if (!tier) {
      throw new Error('Invalid tier or priority');
    }

    return { priority: tier.priority, tier };
  }

  private async recalculateEventPositions(eventId: string, manager: EntityManager): Promise<void> {
    const entries = await manager.find(IntelligentWaitlistEntry, {
      where: { eventId, status: WaitlistStatus.ACTIVE },
      order: { 
        priority: 'DESC', // VIP first
        createdAt: 'ASC',  // Then by join time
      },
    });

    for (let i = 0; i < entries.length; i++) {
      await manager.update(IntelligentWaitlistEntry, entries[i].id, {
        position: i + 1,
        lastPositionUpdate: new Date(),
      });
    }
  }

  private formatBenefits(benefits: VipTier['benefits']): string[] {
    const formatted: string[] = [];

    if (benefits.skipAheadPositions) {
      formatted.push(`Skip ahead ${benefits.skipAheadPositions} positions`);
    }
    if (benefits.earlyAccess) {
      formatted.push('Early access to tickets');
    }
    if (benefits.priceDiscount) {
      formatted.push(`${benefits.priceDiscount}% price discount`);
    }
    if (benefits.extendedOfferTime) {
      formatted.push(`${benefits.extendedOfferTime} hours to respond`);
    }
    if (benefits.personalizedService) {
      formatted.push('Dedicated concierge service');
    }
    if (benefits.exclusiveSeating) {
      formatted.push('Access to exclusive seating areas');
    }

    return formatted;
  }

  private async checkForImmediateOffer(
    entry: IntelligentWaitlistEntry,
    manager: EntityManager
  ): Promise<void> {
    // Check if VIP should get immediate offer based on position and availability
    if (entry.position <= 5 && entry.priority === WaitlistPriority.VIP) {
      const event = await manager.findOne(Event, {
        where: { id: entry.eventId },
      });

      if (event && event.availableTickets > 0) {
        // Create immediate offer for high-priority VIP
        const tier = this.getUserTier(entry);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (tier?.benefits.extendedOfferTime || 24));

        await manager.save(WaitlistTicketRelease, {
          userId: entry.userId,
          eventId: entry.eventId,
          waitlistEntryId: entry.id,
          ticketQuantity: entry.ticketQuantity || 1,
          offerPrice: await this.calculateVipPrice(entry, tier),
          expiresAt,
          releaseReason: ReleaseReason.VIP_PRIORITY,
          status: ReleaseStatus.OFFERED,
          metadata: {
            immediateOffer: true,
            vipTier: tier?.id,
          },
        });

        await this.notificationQueue.add('send-immediate-vip-offer', {
          userId: entry.userId,
          eventId: entry.eventId,
        });
      }
    }
  }

  private async checkUserEligibility(user: User): Promise<VipTier | null> {
    // Check user against VIP tier requirements
    for (const tier of this.vipTiers) {
      const meetsRequirements = await this.checkTierRequirements(user, tier.requirements);
      if (meetsRequirements) {
        return tier;
      }
    }
    return null;
  }

  private async checkTierRequirements(user: User, requirements: VipTier['requirements']): Promise<boolean> {
    // Implementation would check various requirements
    // This is a simplified version
    
    if (requirements.minimumSpend && user.totalSpent < requirements.minimumSpend) {
      return false;
    }

    if (requirements.membershipLevel && user.membershipLevel !== requirements.membershipLevel) {
      return false;
    }

    if (requirements.eventHistory && user.eventsAttended < requirements.eventHistory) {
      return false;
    }

    return true;
  }

  private getQualificationReason(user: User, tier: VipTier): string {
    const reasons: string[] = [];

    if (tier.requirements.minimumSpend && user.totalSpent >= tier.requirements.minimumSpend) {
      reasons.push(`$${user.totalSpent} total spend`);
    }

    if (tier.requirements.membershipLevel && user.membershipLevel === tier.requirements.membershipLevel) {
      reasons.push(`${user.membershipLevel} membership`);
    }

    if (tier.requirements.eventHistory && user.eventsAttended >= tier.requirements.eventHistory) {
      reasons.push(`${user.eventsAttended} events attended`);
    }

    return reasons.join(', ');
  }

  private getUserTier(entry: IntelligentWaitlistEntry): VipTier | null {
    const tierName = entry.metadata?.vipTier;
    return tierName ? this.vipTiers.find(t => t.id === tierName) : null;
  }

  private async calculateVipPrice(entry: IntelligentWaitlistEntry, tier?: VipTier): Promise<number> {
    const event = await this.eventRepository.findOne({
      where: { id: entry.eventId },
    });

    if (!event) return 0;

    const basePrice = event.ticketPrice || 0;
    const discount = tier?.benefits.priceDiscount || 0;

    return Math.round(basePrice * (1 - discount / 100));
  }

  private async getVipBreakdown(eventId: string): Promise<Record<string, number>> {
    // Implementation would get VIP breakdown
    return {};
  }

  private async getVipConversionRates(eventId: string): Promise<Record<string, number>> {
    // Implementation would get VIP conversion rates
    return {};
  }

  private async getVipRevenueImpact(eventId: string): Promise<Record<string, number>> {
    // Implementation would get VIP revenue impact
    return {};
  }

  private async getVipAverageWaitTimes(eventId: string): Promise<Record<string, number>> {
    // Implementation would get VIP average wait times
    return {};
  }

  private async getVipSatisfactionMetrics(eventId: string): Promise<any> {
    // Implementation would get VIP satisfaction metrics
    return {};
  }

  private async getExclusiveSeatingOptions(eventId: string, tier: VipTier): Promise<any[]> {
    // Implementation would get exclusive seating options
    return [];
  }
}
