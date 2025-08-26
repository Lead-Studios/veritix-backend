import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueManagementService } from '../services/queue-management.service';
import { NotificationCampaignService } from '../services/notification-campaign.service';
import { IntelligentWaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistTicketRelease, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';
import { Event } from '../../events/entities/event.entity';

@Processor('ticket-releases')
@Injectable()
export class TicketReleaseProcessor {
  private readonly logger = new Logger(TicketReleaseProcessor.name);

  constructor(
    private readonly queueService: QueueManagementService,
    private readonly campaignService: NotificationCampaignService,
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  /**
   * Process automatic ticket releases when tickets become available
   */
  @Process('process-ticket-release')
  async processTicketRelease(job: Job<{
    eventId: string;
    availableTickets: number;
    strategy?: any;
    triggeredBy?: string;
  }>): Promise<void> {
    const { eventId, availableTickets, strategy, triggeredBy } = job.data;
    
    this.logger.log(`Processing ticket release for event ${eventId}: ${availableTickets} tickets available`);
    
    try {
      const result = await this.queueService.processTicketRelease(
        eventId,
        availableTickets,
        strategy
      );

      this.logger.log(`Ticket release completed: ${result.releasesCreated} releases created, ${result.usersNotified} users notified`);

      // Update job progress
      await job.progress(100);
      
      // Return result for job completion
      return result;
    } catch (error) {
      this.logger.error(`Failed to process ticket release for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Handle ticket release expiration cleanup
   */
  @Process('cleanup-expired-releases')
  async cleanupExpiredReleases(job: Job<{
    batchSize?: number;
    olderThanHours?: number;
  }>): Promise<void> {
    const { batchSize = 100, olderThanHours = 24 } = job.data;
    
    this.logger.log(`Cleaning up expired ticket releases older than ${olderThanHours} hours`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

      const expiredReleases = await this.releaseRepository.find({
        where: {
          status: ReleaseStatus.OFFERED,
          expiresAt: { $lt: cutoffDate } as any,
        },
        take: batchSize,
        relations: ['waitlistEntry'],
      });

      let processed = 0;
      for (const release of expiredReleases) {
        try {
          // Mark as expired
          await this.releaseRepository.update(release.id, {
            status: ReleaseStatus.EXPIRED,
          });

          // Reset waitlist entry status
          await this.waitlistRepository.update(release.waitlistEntry.id, {
            status: WaitlistStatus.ACTIVE,
          });

          // Trigger next user in queue
          await this.queueService.processTicketRelease(release.eventId, 1);

          processed++;
        } catch (error) {
          this.logger.error(`Failed to cleanup release ${release.id}:`, error);
        }
      }

      this.logger.log(`Cleaned up ${processed} expired releases`);
      await job.progress(100);
    } catch (error) {
      this.logger.error('Failed to cleanup expired releases:', error);
      throw error;
    }
  }

  /**
   * Process position recalculation for events
   */
  @Process('recalculate-positions')
  async recalculatePositions(job: Job<{
    eventId?: string;
    eventIds?: string[];
    reason?: string;
  }>): Promise<void> {
    const { eventId, eventIds, reason } = job.data;
    
    const eventsToProcess = eventId ? [eventId] : eventIds || [];
    
    this.logger.log(`Recalculating positions for ${eventsToProcess.length} events. Reason: ${reason || 'Manual trigger'}`);
    
    try {
      let processed = 0;
      for (const eventIdToProcess of eventsToProcess) {
        try {
          await this.queueService.recalculatePositions(eventIdToProcess);
          processed++;
          
          // Update progress
          const progress = Math.round((processed / eventsToProcess.length) * 100);
          await job.progress(progress);
        } catch (error) {
          this.logger.error(`Failed to recalculate positions for event ${eventIdToProcess}:`, error);
        }
      }

      this.logger.log(`Position recalculation completed for ${processed} events`);
    } catch (error) {
      this.logger.error('Failed to recalculate positions:', error);
      throw error;
    }
  }

  /**
   * Process batch ticket releases for high-demand events
   */
  @Process('batch-ticket-release')
  async batchTicketRelease(job: Job<{
    eventId: string;
    totalTickets: number;
    batchSize: number;
    intervalMinutes: number;
    strategy?: any;
  }>): Promise<void> {
    const { eventId, totalTickets, batchSize, intervalMinutes, strategy } = job.data;
    
    this.logger.log(`Starting batch ticket release for event ${eventId}: ${totalTickets} tickets in batches of ${batchSize}`);
    
    try {
      const batches = Math.ceil(totalTickets / batchSize);
      let releasedTickets = 0;
      let totalReleases = 0;
      let totalNotified = 0;

      for (let batch = 0; batch < batches; batch++) {
        const ticketsInBatch = Math.min(batchSize, totalTickets - releasedTickets);
        
        try {
          const result = await this.queueService.processTicketRelease(
            eventId,
            ticketsInBatch,
            strategy
          );

          releasedTickets += ticketsInBatch;
          totalReleases += result.releasesCreated;
          totalNotified += result.usersNotified;

          this.logger.log(`Batch ${batch + 1}/${batches} completed: ${result.releasesCreated} releases, ${result.usersNotified} notifications`);

          // Update progress
          const progress = Math.round((releasedTickets / totalTickets) * 100);
          await job.progress(progress);

          // Wait before next batch (except for last batch)
          if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
          }
        } catch (error) {
          this.logger.error(`Failed to process batch ${batch + 1}:`, error);
        }
      }

      this.logger.log(`Batch release completed: ${totalReleases} total releases, ${totalNotified} users notified`);
    } catch (error) {
      this.logger.error(`Failed to process batch ticket release for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Process smart ticket release based on demand patterns
   */
  @Process('smart-ticket-release')
  async smartTicketRelease(job: Job<{
    eventId: string;
    availableTickets: number;
    demandMetrics?: any;
    timeConstraints?: any;
  }>): Promise<void> {
    const { eventId, availableTickets, demandMetrics, timeConstraints } = job.data;
    
    this.logger.log(`Processing smart ticket release for event ${eventId}`);
    
    try {
      // Analyze current demand and queue metrics
      const queueMetrics = await this.queueService.getQueueMetrics(eventId);
      const optimization = await this.queueService.optimizeQueue(eventId);

      // Use recommended strategy from optimization
      const strategy = optimization.recommendedStrategy;

      // Adjust release timing based on demand patterns
      let releaseStrategy = strategy;
      if (demandMetrics?.peakHours && this.isCurrentlyPeakTime(demandMetrics.peakHours)) {
        // Increase batch size during peak hours
        releaseStrategy = {
          ...strategy,
          batchSize: Math.min(strategy.batchSize * 1.5, availableTickets),
          releaseInterval: Math.max(strategy.releaseInterval * 0.7, 5), // Faster releases
        };
      }

      const result = await this.queueService.processTicketRelease(
        eventId,
        availableTickets,
        releaseStrategy
      );

      this.logger.log(`Smart release completed: ${result.releasesCreated} releases created`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to process smart ticket release for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Process VIP priority releases
   */
  @Process('vip-priority-release')
  async vipPriorityRelease(job: Job<{
    eventId: string;
    ticketQuantity: number;
    vipTiers?: string[];
    exclusiveWindow?: number; // minutes
  }>): Promise<void> {
    const { eventId, ticketQuantity, vipTiers, exclusiveWindow } = job.data;
    
    this.logger.log(`Processing VIP priority release for event ${eventId}: ${ticketQuantity} tickets`);
    
    try {
      // First, offer to VIPs exclusively
      const vipResult = await this.queueService.processTicketRelease(
        eventId,
        ticketQuantity,
        {
          batchSize: ticketQuantity,
          releaseInterval: 0,
          priorityWeights: {
            VIP: 100,
            PREMIUM: 10,
            STANDARD: 0, // Exclude standard users initially
          },
          offerExpirationHours: exclusiveWindow ? exclusiveWindow / 60 : 2,
          considerSeatPreferences: true,
          priceFlexibility: 5,
        }
      );

      this.logger.log(`VIP exclusive phase: ${vipResult.releasesCreated} releases created`);

      // If exclusive window is set, schedule regular release after window expires
      if (exclusiveWindow && vipResult.releasesCreated < ticketQuantity) {
        const remainingTickets = ticketQuantity - vipResult.releasesCreated;
        
        // Schedule regular release after exclusive window
        setTimeout(async () => {
          try {
            await this.queueService.processTicketRelease(eventId, remainingTickets);
          } catch (error) {
            this.logger.error('Failed to process post-VIP release:', error);
          }
        }, exclusiveWindow * 60 * 1000);
      }

      await job.progress(100);
    } catch (error) {
      this.logger.error(`Failed to process VIP priority release for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Process waitlist maintenance tasks
   */
  @Process('waitlist-maintenance')
  async waitlistMaintenance(job: Job<{
    tasks: string[];
    eventIds?: string[];
  }>): Promise<void> {
    const { tasks, eventIds } = job.data;
    
    this.logger.log(`Running waitlist maintenance tasks: ${tasks.join(', ')}`);
    
    try {
      let completedTasks = 0;

      for (const task of tasks) {
        try {
          switch (task) {
            case 'cleanup_expired_releases':
              await this.cleanupExpiredReleases({ data: {} } as Job);
              break;
              
            case 'recalculate_positions':
              if (eventIds?.length) {
                await this.recalculatePositions({ data: { eventIds } } as Job);
              }
              break;
              
            case 'update_wait_times':
              await this.updateEstimatedWaitTimes(eventIds);
              break;
              
            case 'cleanup_inactive_entries':
              await this.cleanupInactiveEntries();
              break;
              
            case 'sync_notification_preferences':
              await this.syncNotificationPreferences();
              break;
              
            default:
              this.logger.warn(`Unknown maintenance task: ${task}`);
          }
          
          completedTasks++;
          const progress = Math.round((completedTasks / tasks.length) * 100);
          await job.progress(progress);
        } catch (error) {
          this.logger.error(`Failed to complete maintenance task ${task}:`, error);
        }
      }

      this.logger.log(`Maintenance completed: ${completedTasks}/${tasks.length} tasks successful`);
    } catch (error) {
      this.logger.error('Failed to run waitlist maintenance:', error);
      throw error;
    }
  }

  // Private helper methods

  private isCurrentlyPeakTime(peakHours: number[]): boolean {
    const currentHour = new Date().getHours();
    return peakHours.includes(currentHour);
  }

  private async updateEstimatedWaitTimes(eventIds?: string[]): Promise<void> {
    this.logger.log('Updating estimated wait times');
    
    const events = eventIds?.length 
      ? await this.eventRepository.findByIds(eventIds)
      : await this.eventRepository.find({ where: { status: 'active' } });

    for (const event of events) {
      try {
        const entries = await this.waitlistRepository.find({
          where: { eventId: event.id, status: WaitlistStatus.ACTIVE },
          order: { position: 'ASC' },
        });

        for (const entry of entries) {
          const estimatedWaitTime = await this.calculateEstimatedWaitTime(
            entry.position,
            event.id,
            entry.priority
          );

          await this.waitlistRepository.update(entry.id, {
            estimatedWaitTime,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to update wait times for event ${event.id}:`, error);
      }
    }
  }

  private async cleanupInactiveEntries(): Promise<void> {
    this.logger.log('Cleaning up inactive waitlist entries');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days old

    const inactiveEntries = await this.waitlistRepository.find({
      where: {
        status: WaitlistStatus.ACTIVE,
        lastNotificationAt: { $lt: cutoffDate } as any,
        createdAt: { $lt: cutoffDate } as any,
      },
      take: 1000, // Process in batches
    });

    for (const entry of inactiveEntries) {
      try {
        await this.waitlistRepository.update(entry.id, {
          status: WaitlistStatus.INACTIVE,
          metadata: {
            ...entry.metadata,
            deactivatedAt: new Date(),
            deactivationReason: 'Inactive for 90+ days',
          },
        });
      } catch (error) {
        this.logger.error(`Failed to deactivate entry ${entry.id}:`, error);
      }
    }

    this.logger.log(`Deactivated ${inactiveEntries.length} inactive entries`);
  }

  private async syncNotificationPreferences(): Promise<void> {
    this.logger.log('Syncing notification preferences');
    
    // Implementation would sync preferences with external services
    // This is a placeholder for the actual sync logic
  }

  private async calculateEstimatedWaitTime(
    position: number,
    eventId: string,
    priority: any
  ): Promise<number> {
    // Implementation would calculate estimated wait time based on historical data
    // This is a simplified version
    const baseWaitTime = position * 24; // 24 hours per position
    const priorityMultiplier = priority === 'VIP' ? 0.3 : priority === 'PREMIUM' ? 0.6 : 1.0;
    
    return Math.round(baseWaitTime * priorityMultiplier);
  }
}
