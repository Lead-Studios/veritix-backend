import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, LessThan, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistTicketRelease, ReleaseReason, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

export interface TicketReleaseStrategy {
  batchSize: number;
  releaseInterval: number; // minutes
  priorityWeights: Record<WaitlistPriority, number>;
  maxOffersPerUser: number;
  offerExpirationHours: number;
  considerSeatPreferences: boolean;
  priceFlexibility: number; // percentage
}

export interface QueueMetrics {
  totalActive: number;
  averageWaitTime: number;
  conversionRate: number;
  positionMovement: number;
  estimatedProcessingTime: number;
}

@Injectable()
export class QueueManagementService {
  private readonly logger = new Logger(QueueManagementService.name);

  private readonly defaultStrategy: TicketReleaseStrategy = {
    batchSize: 10,
    releaseInterval: 15,
    priorityWeights: {
      [WaitlistPriority.VIP]: 10,
      [WaitlistPriority.PREMIUM]: 5,
      [WaitlistPriority.STANDARD]: 1,
    },
    maxOffersPerUser: 3,
    offerExpirationHours: 24,
    considerSeatPreferences: true,
    priceFlexibility: 10,
  };

  constructor(
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectQueue('ticket-releases')
    private ticketReleaseQueue: Queue,
    @InjectQueue('waitlist-notifications')
    private notificationQueue: Queue,
    private entityManager: EntityManager,
  ) {}

  /**
   * Process automatic ticket releases when tickets become available
   */
  async processTicketRelease(eventId: string, availableTickets: number, strategy?: TicketReleaseStrategy): Promise<{
    releasesCreated: number;
    usersNotified: number;
    nextBatchScheduled: boolean;
  }> {
    this.logger.log(`Processing ticket release for event ${eventId}, ${availableTickets} tickets available`);

    const releaseStrategy = { ...this.defaultStrategy, ...strategy };
    
    return await this.entityManager.transaction(async (manager) => {
      // Get eligible waitlist entries
      const eligibleEntries = await this.getEligibleEntries(eventId, releaseStrategy, manager);
      
      if (eligibleEntries.length === 0) {
        this.logger.log('No eligible waitlist entries found');
        return { releasesCreated: 0, usersNotified: 0, nextBatchScheduled: false };
      }

      // Calculate optimal batch size
      const batchSize = Math.min(
        releaseStrategy.batchSize,
        availableTickets,
        eligibleEntries.length
      );

      // Select users using weighted algorithm
      const selectedEntries = await this.selectEntriesForRelease(
        eligibleEntries.slice(0, batchSize * 2), // Get more candidates for better selection
        batchSize,
        releaseStrategy
      );

      let releasesCreated = 0;
      let usersNotified = 0;

      // Create ticket releases
      for (const entry of selectedEntries) {
        try {
          const release = await this.createTicketRelease(entry, releaseStrategy, manager);
          if (release) {
            releasesCreated++;
            
            // Queue notification
            await this.notificationQueue.add('send-ticket-available', {
              releaseId: release.id,
              userId: entry.userId,
              eventId: entry.eventId,
            });
            usersNotified++;

            // Update waitlist entry status
            await manager.update(IntelligentWaitlistEntry, entry.id, {
              status: WaitlistStatus.NOTIFIED,
              lastNotificationAt: new Date(),
            });
          }
        } catch (error) {
          this.logger.error(`Failed to create release for entry ${entry.id}:`, error);
        }
      }

      // Schedule next batch if more tickets available and more users waiting
      const nextBatchScheduled = await this.scheduleNextBatch(
        eventId,
        availableTickets - releasesCreated,
        releaseStrategy
      );

      return { releasesCreated, usersNotified, nextBatchScheduled };
    });
  }

  /**
   * Recalculate all waitlist positions for an event
   */
  async recalculatePositions(eventId: string): Promise<void> {
    this.logger.log(`Recalculating positions for event ${eventId}`);

    await this.entityManager.transaction(async (manager) => {
      const entries = await manager.find(IntelligentWaitlistEntry, {
        where: { eventId, status: WaitlistStatus.ACTIVE },
        order: { 
          priority: 'DESC', // VIP first
          createdAt: 'ASC',  // Then by join time
        },
      });

      for (let i = 0; i < entries.length; i++) {
        const newPosition = i + 1;
        const estimatedWaitTime = await this.calculateEstimatedWaitTime(
          newPosition,
          eventId,
          entries[i].priority
        );

        await manager.update(IntelligentWaitlistEntry, entries[i].id, {
          position: newPosition,
          estimatedWaitTime,
          lastPositionUpdate: new Date(),
        });
      }
    });
  }

  /**
   * Handle ticket release response (accept/decline)
   */
  async handleReleaseResponse(releaseId: string, response: 'accept' | 'decline'): Promise<{
    success: boolean;
    ticketsReserved?: number;
    nextUserNotified?: boolean;
  }> {
    this.logger.log(`Handling release response: ${response} for release ${releaseId}`);

    return await this.entityManager.transaction(async (manager) => {
      const release = await manager.findOne(WaitlistTicketRelease, {
        where: { id: releaseId },
        relations: ['waitlistEntry'],
      });

      if (!release || release.status !== ReleaseStatus.OFFERED) {
        throw new Error('Invalid or expired ticket release');
      }

      if (response === 'accept') {
        // Mark as accepted and reserve tickets
        await manager.update(WaitlistTicketRelease, releaseId, {
          status: ReleaseStatus.ACCEPTED,
          respondedAt: new Date(),
        });

        await manager.update(IntelligentWaitlistEntry, release.waitlistEntry.id, {
          status: WaitlistStatus.CONVERTED,
        });

        // Reserve actual tickets
        const ticketsReserved = await this.reserveTickets(
          release.eventId,
          release.waitlistEntry.userId,
          release.ticketQuantity,
          release.offerPrice,
          manager
        );

        // Trigger next user notification
        const nextUserNotified = await this.processNextInQueue(release.eventId);

        return { success: true, ticketsReserved, nextUserNotified };

      } else {
        // Mark as declined and move to next user
        await manager.update(WaitlistTicketRelease, releaseId, {
          status: ReleaseStatus.DECLINED,
          respondedAt: new Date(),
        });

        await manager.update(IntelligentWaitlistEntry, release.waitlistEntry.id, {
          status: WaitlistStatus.ACTIVE,
        });

        // Recalculate positions and notify next user
        await this.recalculatePositions(release.eventId);
        const nextUserNotified = await this.processNextInQueue(release.eventId);

        return { success: true, nextUserNotified };
      }
    });
  }

  /**
   * Get queue metrics for analytics
   */
  async getQueueMetrics(eventId: string): Promise<QueueMetrics> {
    const [
      totalActive,
      averageWaitTime,
      conversionRate,
      positionMovement,
      estimatedProcessingTime,
    ] = await Promise.all([
      this.waitlistRepository.count({ 
        where: { eventId, status: WaitlistStatus.ACTIVE } 
      }),
      this.calculateAverageWaitTime(eventId),
      this.calculateConversionRate(eventId),
      this.calculatePositionMovement(eventId),
      this.calculateEstimatedProcessingTime(eventId),
    ]);

    return {
      totalActive,
      averageWaitTime,
      conversionRate,
      positionMovement,
      estimatedProcessingTime,
    };
  }

  /**
   * Optimize queue based on historical data
   */
  async optimizeQueue(eventId: string): Promise<{
    recommendedStrategy: TicketReleaseStrategy;
    projectedImprovements: any;
    implementationPlan: string[];
  }> {
    this.logger.log(`Optimizing queue for event ${eventId}`);

    const metrics = await this.getQueueMetrics(eventId);
    const historicalData = await this.getHistoricalPerformance(eventId);
    
    const recommendedStrategy = await this.generateOptimizedStrategy(
      metrics,
      historicalData,
      this.defaultStrategy
    );

    const projectedImprovements = await this.projectImprovements(
      metrics,
      recommendedStrategy
    );

    const implementationPlan = this.generateImplementationPlan(
      this.defaultStrategy,
      recommendedStrategy
    );

    return {
      recommendedStrategy,
      projectedImprovements,
      implementationPlan,
    };
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
      await this.entityManager.transaction(async (manager) => {
        // Mark offer as expired
        await manager.update(WaitlistTicketRelease, offer.id, {
          status: ReleaseStatus.EXPIRED,
        });

        // Reset waitlist entry status
        await manager.update(IntelligentWaitlistEntry, offer.waitlistEntry.id, {
          status: WaitlistStatus.ACTIVE,
        });

        // Process next user in queue
        await this.processNextInQueue(offer.eventId);
      });
    }

    this.logger.log(`Cleaned up ${expiredOffers.length} expired offers`);
  }

  /**
   * Scheduled job to process pending releases
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async processPendingReleases(): Promise<void> {
    this.logger.log('Processing pending ticket releases');

    const eventsWithAvailableTickets = await this.getEventsWithAvailableTickets();
    
    for (const event of eventsWithAvailableTickets) {
      try {
        await this.processTicketRelease(event.id, event.availableTickets);
      } catch (error) {
        this.logger.error(`Failed to process releases for event ${event.id}:`, error);
      }
    }
  }

  // Private helper methods

  private async getEligibleEntries(
    eventId: string,
    strategy: TicketReleaseStrategy,
    manager: EntityManager
  ): Promise<IntelligentWaitlistEntry[]> {
    const queryBuilder = manager
      .createQueryBuilder(IntelligentWaitlistEntry, 'entry')
      .leftJoinAndSelect('entry.user', 'user')
      .where('entry.eventId = :eventId', { eventId })
      .andWhere('entry.status = :status', { status: WaitlistStatus.ACTIVE })
      .orderBy('entry.priority', 'DESC')
      .addOrderBy('entry.createdAt', 'ASC');

    // Exclude users who already have pending offers
    const usersWithPendingOffers = await manager
      .createQueryBuilder(WaitlistTicketRelease, 'release')
      .select('release.userId')
      .where('release.eventId = :eventId', { eventId })
      .andWhere('release.status = :status', { status: ReleaseStatus.OFFERED })
      .getRawMany();

    if (usersWithPendingOffers.length > 0) {
      const excludedUserIds = usersWithPendingOffers.map(u => u.userId);
      queryBuilder.andWhere('entry.userId NOT IN (:...excludedUserIds)', { excludedUserIds });
    }

    return await queryBuilder.getMany();
  }

  private async selectEntriesForRelease(
    candidates: IntelligentWaitlistEntry[],
    batchSize: number,
    strategy: TicketReleaseStrategy
  ): Promise<IntelligentWaitlistEntry[]> {
    // Apply weighted selection based on priority and other factors
    const scoredCandidates = candidates.map(entry => ({
      entry,
      score: this.calculateSelectionScore(entry, strategy),
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Select top candidates
    return scoredCandidates.slice(0, batchSize).map(c => c.entry);
  }

  private calculateSelectionScore(
    entry: IntelligentWaitlistEntry,
    strategy: TicketReleaseStrategy
  ): number {
    let score = 0;

    // Priority weight
    score += strategy.priorityWeights[entry.priority] || 1;

    // Wait time bonus (longer wait = higher score)
    const waitDays = entry.waitingDays || 0;
    score += waitDays * 0.1;

    // Position bonus (earlier position = higher score)
    score += Math.max(0, 100 - entry.position) * 0.01;

    // Seat preference match (if applicable)
    if (strategy.considerSeatPreferences && entry.seatPreferences) {
      // Add bonus for specific preferences
      score += 0.5;
    }

    return score;
  }

  private async createTicketRelease(
    entry: IntelligentWaitlistEntry,
    strategy: TicketReleaseStrategy,
    manager: EntityManager
  ): Promise<WaitlistTicketRelease> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + strategy.offerExpirationHours);

    // Calculate offer price (could include dynamic pricing)
    const offerPrice = await this.calculateOfferPrice(entry, strategy);

    const release = manager.create(WaitlistTicketRelease, {
      userId: entry.userId,
      eventId: entry.eventId,
      waitlistEntryId: entry.id,
      ticketQuantity: entry.ticketQuantity || 1,
      offerPrice,
      expiresAt,
      releaseReason: ReleaseReason.TICKET_AVAILABLE,
      status: ReleaseStatus.OFFERED,
      metadata: {
        strategy: strategy,
        selectionScore: this.calculateSelectionScore(entry, strategy),
      },
    });

    return await manager.save(release);
  }

  private async calculateOfferPrice(
    entry: IntelligentWaitlistEntry,
    strategy: TicketReleaseStrategy
  ): Promise<number> {
    // Get base ticket price
    const event = await this.eventRepository.findOne({
      where: { id: entry.eventId },
    });

    if (!event) return 0;

    let basePrice = event.ticketPrice || 0;

    // Apply price flexibility
    const maxPrice = entry.maxPriceWilling || basePrice;
    const flexibilityRange = basePrice * (strategy.priceFlexibility / 100);
    
    // Offer price within user's budget and flexibility range
    return Math.min(maxPrice, basePrice + flexibilityRange);
  }

  private async scheduleNextBatch(
    eventId: string,
    remainingTickets: number,
    strategy: TicketReleaseStrategy
  ): Promise<boolean> {
    if (remainingTickets <= 0) return false;

    const hasMoreWaiting = await this.waitlistRepository.count({
      where: { eventId, status: WaitlistStatus.ACTIVE },
    });

    if (hasMoreWaiting === 0) return false;

    // Schedule next batch
    await this.ticketReleaseQueue.add(
      'process-ticket-release',
      { eventId, availableTickets: remainingTickets, strategy },
      { delay: strategy.releaseInterval * 60 * 1000 } // Convert minutes to milliseconds
    );

    return true;
  }

  private async processNextInQueue(eventId: string): Promise<boolean> {
    const nextEntry = await this.waitlistRepository.findOne({
      where: { eventId, status: WaitlistStatus.ACTIVE },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    if (!nextEntry) return false;

    // Check if tickets are available
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (event && event.availableTickets > 0) {
      await this.processTicketRelease(eventId, 1);
      return true;
    }

    return false;
  }

  private async reserveTickets(
    eventId: string,
    userId: string,
    quantity: number,
    price: number,
    manager: EntityManager
  ): Promise<number> {
    // Implementation would create actual ticket reservations
    // This is a placeholder
    return quantity;
  }

  private async calculateEstimatedWaitTime(
    position: number,
    eventId: string,
    priority: WaitlistPriority
  ): Promise<number> {
    // Calculate based on historical conversion rates and position
    const baseWaitTime = position * 24; // Base: 24 hours per position
    
    // Adjust for priority
    const priorityMultiplier = {
      [WaitlistPriority.VIP]: 0.3,
      [WaitlistPriority.PREMIUM]: 0.6,
      [WaitlistPriority.STANDARD]: 1.0,
    };

    return Math.round(baseWaitTime * priorityMultiplier[priority]);
  }

  private async calculateAverageWaitTime(eventId: string): Promise<number> {
    // Implementation would calculate average wait time
    return 0;
  }

  private async calculateConversionRate(eventId: string): Promise<number> {
    // Implementation would calculate conversion rate
    return 0;
  }

  private async calculatePositionMovement(eventId: string): Promise<number> {
    // Implementation would calculate position movement
    return 0;
  }

  private async calculateEstimatedProcessingTime(eventId: string): Promise<number> {
    // Implementation would calculate estimated processing time
    return 0;
  }

  private async getHistoricalPerformance(eventId: string): Promise<any> {
    // Implementation would get historical performance data
    return {};
  }

  private async generateOptimizedStrategy(
    metrics: QueueMetrics,
    historicalData: any,
    currentStrategy: TicketReleaseStrategy
  ): Promise<TicketReleaseStrategy> {
    // Implementation would generate optimized strategy
    return currentStrategy;
  }

  private async projectImprovements(
    metrics: QueueMetrics,
    strategy: TicketReleaseStrategy
  ): Promise<any> {
    // Implementation would project improvements
    return {};
  }

  private generateImplementationPlan(
    current: TicketReleaseStrategy,
    recommended: TicketReleaseStrategy
  ): string[] {
    // Implementation would generate implementation plan
    return [];
  }

  private async getEventsWithAvailableTickets(): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { availableTickets: MoreThan(0) },
      select: ['id', 'availableTickets'],
    });
  }
}
