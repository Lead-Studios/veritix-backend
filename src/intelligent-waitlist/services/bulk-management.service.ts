import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IntelligentWaitlistEntry, WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { WaitlistNotificationPreference, NotificationChannel } from '../entities/waitlist-notification-preference.entity';
import { WaitlistTicketRelease, ReleaseStatus } from '../entities/waitlist-ticket-release.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  summary: string;
}

export interface BulkFilter {
  eventIds?: string[];
  userIds?: string[];
  priorities?: WaitlistPriority[];
  statuses?: WaitlistStatus[];
  positionRange?: { min: number; max: number };
  joinDateRange?: { start: Date; end: Date };
  waitTimeRange?: { min: number; max: number };
  priceRange?: { min: number; max: number };
  hasNotificationPreferences?: boolean;
  tags?: string[];
}

export interface BulkUpdateData {
  priority?: WaitlistPriority;
  status?: WaitlistStatus;
  maxPriceWilling?: number;
  ticketQuantity?: number;
  seatPreferences?: any;
  metadata?: any;
  tags?: string[];
}

@Injectable()
export class BulkManagementService {
  private readonly logger = new Logger(BulkManagementService.name);

  constructor(
    @InjectRepository(IntelligentWaitlistEntry)
    private waitlistRepository: Repository<IntelligentWaitlistEntry>,
    @InjectRepository(WaitlistNotificationPreference)
    private preferencesRepository: Repository<WaitlistNotificationPreference>,
    @InjectRepository(WaitlistTicketRelease)
    private releaseRepository: Repository<WaitlistTicketRelease>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectQueue('bulk-operations')
    private bulkQueue: Queue,
    @InjectQueue('waitlist-notifications')
    private notificationQueue: Queue,
    private entityManager: EntityManager,
  ) {}

  /**
   * Bulk update waitlist entries
   */
  async bulkUpdate(
    filter: BulkFilter,
    updateData: BulkUpdateData,
    options: { dryRun?: boolean; batchSize?: number } = {}
  ): Promise<BulkOperationResult> {
    this.logger.log('Starting bulk update operation');

    const { dryRun = false, batchSize = 100 } = options;
    const entries = await this.getFilteredEntries(filter);

    if (dryRun) {
      return {
        success: true,
        processed: entries.length,
        succeeded: entries.length,
        failed: 0,
        errors: [],
        summary: `Dry run: ${entries.length} entries would be updated`,
      };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      try {
        await this.entityManager.transaction(async (manager) => {
          for (const entry of batch) {
            try {
              await this.updateSingleEntry(entry, updateData, manager);
              succeeded++;
            } catch (error) {
              failed++;
              errors.push({
                id: entry.id,
                error: error.message,
              });
            }
          }
        });
      } catch (error) {
        this.logger.error(`Batch update failed:`, error);
        failed += batch.length;
      }
    }

    // Recalculate positions if priority was changed
    if (updateData.priority) {
      const affectedEvents = [...new Set(entries.map(e => e.eventId))];
      for (const eventId of affectedEvents) {
        await this.recalculatePositions(eventId);
      }
    }

    return {
      success: failed === 0,
      processed: entries.length,
      succeeded,
      failed,
      errors,
      summary: `Updated ${succeeded} entries, ${failed} failed`,
    };
  }

  /**
   * Bulk remove users from waitlists
   */
  async bulkRemove(
    filter: BulkFilter,
    reason?: string,
    options: { dryRun?: boolean; notifyUsers?: boolean } = {}
  ): Promise<BulkOperationResult> {
    this.logger.log('Starting bulk remove operation');

    const { dryRun = false, notifyUsers = true } = options;
    const entries = await this.getFilteredEntries(filter);

    if (dryRun) {
      return {
        success: true,
        processed: entries.length,
        succeeded: entries.length,
        failed: 0,
        errors: [],
        summary: `Dry run: ${entries.length} entries would be removed`,
      };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const entry of entries) {
      try {
        await this.entityManager.transaction(async (manager) => {
          // Update status to removed
          await manager.update(IntelligentWaitlistEntry, entry.id, {
            status: WaitlistStatus.REMOVED,
            metadata: {
              ...entry.metadata,
              removedAt: new Date(),
              removeReason: reason || 'Bulk removal',
            },
          });

          // Cancel any pending releases
          await manager.update(WaitlistTicketRelease, 
            { waitlistEntryId: entry.id, status: ReleaseStatus.OFFERED },
            { status: ReleaseStatus.CANCELLED }
          );

          // Send notification if requested
          if (notifyUsers) {
            await this.notificationQueue.add('send-removal-notification', {
              userId: entry.userId,
              eventId: entry.eventId,
              reason: reason || 'Bulk removal',
            });
          }
        });

        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          id: entry.id,
          error: error.message,
        });
      }
    }

    // Recalculate positions for affected events
    const affectedEvents = [...new Set(entries.map(e => e.eventId))];
    for (const eventId of affectedEvents) {
      await this.recalculatePositions(eventId);
    }

    return {
      success: failed === 0,
      processed: entries.length,
      succeeded,
      failed,
      errors,
      summary: `Removed ${succeeded} entries, ${failed} failed`,
    };
  }

  /**
   * Bulk import users to waitlist
   */
  async bulkImport(
    eventId: string,
    userData: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      priority?: WaitlistPriority;
      maxPriceWilling?: number;
      ticketQuantity?: number;
      seatPreferences?: any;
      tags?: string[];
    }>,
    options: { skipDuplicates?: boolean; sendWelcome?: boolean } = {}
  ): Promise<BulkOperationResult> {
    this.logger.log(`Starting bulk import for event ${eventId}`);

    const { skipDuplicates = true, sendWelcome = true } = options;
    
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const userInfo of userData) {
      try {
        await this.entityManager.transaction(async (manager) => {
          // Find or create user
          let user = await manager.findOne(User, {
            where: { email: userInfo.email },
          });

          if (!user) {
            user = await manager.save(User, {
              email: userInfo.email,
              firstName: userInfo.firstName || '',
              lastName: userInfo.lastName || '',
            });
          }

          // Check for existing entry
          const existingEntry = await manager.findOne(IntelligentWaitlistEntry, {
            where: { userId: user.id, eventId },
          });

          if (existingEntry && skipDuplicates) {
            return; // Skip duplicate
          }

          if (existingEntry && !skipDuplicates) {
            throw new Error('User already on waitlist');
          }

          // Create waitlist entry
          const entry = await manager.save(IntelligentWaitlistEntry, {
            userId: user.id,
            eventId,
            priority: userInfo.priority || WaitlistPriority.STANDARD,
            maxPriceWilling: userInfo.maxPriceWilling,
            ticketQuantity: userInfo.ticketQuantity || 1,
            seatPreferences: userInfo.seatPreferences,
            status: WaitlistStatus.ACTIVE,
            metadata: {
              importedAt: new Date(),
              tags: userInfo.tags || [],
            },
          });

          // Send welcome notification
          if (sendWelcome) {
            await this.notificationQueue.add('send-welcome-notification', {
              userId: user.id,
              eventId,
              entryId: entry.id,
            });
          }
        });

        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          id: userInfo.email,
          error: error.message,
        });
      }
    }

    // Recalculate positions
    await this.recalculatePositions(eventId);

    return {
      success: failed === 0,
      processed: userData.length,
      succeeded,
      failed,
      errors,
      summary: `Imported ${succeeded} users, ${failed} failed`,
    };
  }

  /**
   * Bulk export waitlist data
   */
  async bulkExport(
    filter: BulkFilter,
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<{
    data: any;
    filename: string;
    contentType: string;
  }> {
    this.logger.log('Starting bulk export operation');

    const entries = await this.getFilteredEntries(filter, {
      relations: ['user', 'event', 'notificationPreferences'],
    });

    const exportData = entries.map(entry => ({
      id: entry.id,
      userEmail: entry.user.email,
      userName: `${entry.user.firstName} ${entry.user.lastName}`,
      eventName: entry.event.name,
      priority: entry.priority,
      status: entry.status,
      position: entry.position,
      joinedAt: entry.createdAt,
      waitingDays: entry.waitingDays,
      estimatedWaitTime: entry.estimatedWaitTime,
      maxPriceWilling: entry.maxPriceWilling,
      ticketQuantity: entry.ticketQuantity,
      seatPreferences: JSON.stringify(entry.seatPreferences),
      notificationChannels: entry.notificationPreferences?.map(p => p.channel).join(', '),
      tags: entry.metadata?.tags?.join(', ') || '',
      lastNotificationAt: entry.lastNotificationAt,
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(exportData, null, 2),
          filename: `waitlist-export-${timestamp}.json`,
          contentType: 'application/json',
        };
      
      case 'xlsx':
        // Implementation would use a library like xlsx
        return {
          data: exportData, // Would be converted to Excel format
          filename: `waitlist-export-${timestamp}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      
      default: // CSV
        const csvHeaders = Object.keys(exportData[0] || {}).join(',');
        const csvRows = exportData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        );
        
        return {
          data: [csvHeaders, ...csvRows].join('\n'),
          filename: `waitlist-export-${timestamp}.csv`,
          contentType: 'text/csv',
        };
    }
  }

  /**
   * Bulk notification preferences update
   */
  async bulkUpdateNotificationPreferences(
    filter: BulkFilter,
    preferences: {
      channels?: NotificationChannel[];
      enabled?: boolean;
      quietHours?: any;
      notificationTypes?: any;
    }
  ): Promise<BulkOperationResult> {
    this.logger.log('Starting bulk notification preferences update');

    const entries = await this.getFilteredEntries(filter, {
      relations: ['notificationPreferences'],
    });

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const entry of entries) {
      try {
        await this.entityManager.transaction(async (manager) => {
          // Update existing preferences or create new ones
          if (preferences.channels) {
            // Remove old preferences
            await manager.delete(WaitlistNotificationPreference, {
              waitlistEntryId: entry.id,
            });

            // Create new preferences for each channel
            for (const channel of preferences.channels) {
              await manager.save(WaitlistNotificationPreference, {
                waitlistEntryId: entry.id,
                channel,
                enabled: preferences.enabled ?? true,
                quietHours: preferences.quietHours,
                notificationTypes: preferences.notificationTypes,
              });
            }
          } else {
            // Update existing preferences
            await manager.update(WaitlistNotificationPreference,
              { waitlistEntryId: entry.id },
              {
                enabled: preferences.enabled,
                quietHours: preferences.quietHours,
                notificationTypes: preferences.notificationTypes,
              }
            );
          }
        });

        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          id: entry.id,
          error: error.message,
        });
      }
    }

    return {
      success: failed === 0,
      processed: entries.length,
      succeeded,
      failed,
      errors,
      summary: `Updated preferences for ${succeeded} entries, ${failed} failed`,
    };
  }

  /**
   * Bulk position adjustment
   */
  async bulkAdjustPositions(
    filter: BulkFilter,
    adjustment: { type: 'move_up' | 'move_down' | 'set_position'; value: number }
  ): Promise<BulkOperationResult> {
    this.logger.log('Starting bulk position adjustment');

    const entries = await this.getFilteredEntries(filter);
    
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Group by event for position recalculation
    const entriesByEvent = entries.reduce((acc, entry) => {
      if (!acc[entry.eventId]) acc[entry.eventId] = [];
      acc[entry.eventId].push(entry);
      return acc;
    }, {} as Record<string, IntelligentWaitlistEntry[]>);

    for (const [eventId, eventEntries] of Object.entries(entriesByEvent)) {
      try {
        await this.entityManager.transaction(async (manager) => {
          for (const entry of eventEntries) {
            let newPosition = entry.position;

            switch (adjustment.type) {
              case 'move_up':
                newPosition = Math.max(1, entry.position - adjustment.value);
                break;
              case 'move_down':
                newPosition = entry.position + adjustment.value;
                break;
              case 'set_position':
                newPosition = adjustment.value;
                break;
            }

            await manager.update(IntelligentWaitlistEntry, entry.id, {
              position: newPosition,
              lastPositionUpdate: new Date(),
            });

            succeeded++;
          }

          // Recalculate all positions for the event to ensure consistency
          await this.recalculatePositions(eventId, manager);
        });
      } catch (error) {
        failed += eventEntries.length;
        eventEntries.forEach(entry => {
          errors.push({
            id: entry.id,
            error: error.message,
          });
        });
      }
    }

    return {
      success: failed === 0,
      processed: entries.length,
      succeeded,
      failed,
      errors,
      summary: `Adjusted positions for ${succeeded} entries, ${failed} failed`,
    };
  }

  /**
   * Get bulk operation statistics
   */
  async getBulkOperationStats(filter: BulkFilter): Promise<{
    totalEntries: number;
    statusBreakdown: Record<WaitlistStatus, number>;
    priorityBreakdown: Record<WaitlistPriority, number>;
    averagePosition: number;
    averageWaitTime: number;
    positionRange: { min: number; max: number };
    estimatedImpact: any;
  }> {
    const entries = await this.getFilteredEntries(filter);

    const statusBreakdown = entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<WaitlistStatus, number>);

    const priorityBreakdown = entries.reduce((acc, entry) => {
      acc[entry.priority] = (acc[entry.priority] || 0) + 1;
      return acc;
    }, {} as Record<WaitlistPriority, number>);

    const positions = entries.map(e => e.position).filter(p => p > 0);
    const waitTimes = entries.map(e => e.estimatedWaitTime).filter(t => t > 0);

    return {
      totalEntries: entries.length,
      statusBreakdown,
      priorityBreakdown,
      averagePosition: positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      positionRange: {
        min: positions.length > 0 ? Math.min(...positions) : 0,
        max: positions.length > 0 ? Math.max(...positions) : 0,
      },
      estimatedImpact: await this.calculateEstimatedImpact(entries),
    };
  }

  // Private helper methods

  private async getFilteredEntries(
    filter: BulkFilter,
    options: { relations?: string[] } = {}
  ): Promise<IntelligentWaitlistEntry[]> {
    const queryBuilder = this.waitlistRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.event', 'event');

    if (options.relations?.includes('notificationPreferences')) {
      queryBuilder.leftJoinAndSelect('entry.notificationPreferences', 'preferences');
    }

    if (filter.eventIds?.length) {
      queryBuilder.andWhere('entry.eventId IN (:...eventIds)', { eventIds: filter.eventIds });
    }

    if (filter.userIds?.length) {
      queryBuilder.andWhere('entry.userId IN (:...userIds)', { userIds: filter.userIds });
    }

    if (filter.priorities?.length) {
      queryBuilder.andWhere('entry.priority IN (:...priorities)', { priorities: filter.priorities });
    }

    if (filter.statuses?.length) {
      queryBuilder.andWhere('entry.status IN (:...statuses)', { statuses: filter.statuses });
    }

    if (filter.positionRange) {
      if (filter.positionRange.min) {
        queryBuilder.andWhere('entry.position >= :minPosition', { minPosition: filter.positionRange.min });
      }
      if (filter.positionRange.max) {
        queryBuilder.andWhere('entry.position <= :maxPosition', { maxPosition: filter.positionRange.max });
      }
    }

    if (filter.joinDateRange) {
      queryBuilder.andWhere('entry.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filter.joinDateRange.start,
        endDate: filter.joinDateRange.end,
      });
    }

    if (filter.waitTimeRange) {
      if (filter.waitTimeRange.min) {
        queryBuilder.andWhere('entry.estimatedWaitTime >= :minWait', { minWait: filter.waitTimeRange.min });
      }
      if (filter.waitTimeRange.max) {
        queryBuilder.andWhere('entry.estimatedWaitTime <= :maxWait', { maxWait: filter.waitTimeRange.max });
      }
    }

    if (filter.priceRange) {
      if (filter.priceRange.min) {
        queryBuilder.andWhere('entry.maxPriceWilling >= :minPrice', { minPrice: filter.priceRange.min });
      }
      if (filter.priceRange.max) {
        queryBuilder.andWhere('entry.maxPriceWilling <= :maxPrice', { maxPrice: filter.priceRange.max });
      }
    }

    if (filter.tags?.length) {
      queryBuilder.andWhere('entry.metadata->>\'tags\' ?| array[:...tags]', { tags: filter.tags });
    }

    return await queryBuilder.getMany();
  }

  private async updateSingleEntry(
    entry: IntelligentWaitlistEntry,
    updateData: BulkUpdateData,
    manager: EntityManager
  ): Promise<void> {
    const updatePayload: any = {};

    if (updateData.priority !== undefined) updatePayload.priority = updateData.priority;
    if (updateData.status !== undefined) updatePayload.status = updateData.status;
    if (updateData.maxPriceWilling !== undefined) updatePayload.maxPriceWilling = updateData.maxPriceWilling;
    if (updateData.ticketQuantity !== undefined) updatePayload.ticketQuantity = updateData.ticketQuantity;
    if (updateData.seatPreferences !== undefined) updatePayload.seatPreferences = updateData.seatPreferences;

    if (updateData.metadata || updateData.tags) {
      updatePayload.metadata = {
        ...entry.metadata,
        ...updateData.metadata,
        ...(updateData.tags && { tags: updateData.tags }),
        bulkUpdatedAt: new Date(),
      };
    }

    await manager.update(IntelligentWaitlistEntry, entry.id, updatePayload);
  }

  private async recalculatePositions(eventId: string, manager?: EntityManager): Promise<void> {
    const em = manager || this.entityManager;
    
    const entries = await em.find(IntelligentWaitlistEntry, {
      where: { eventId, status: WaitlistStatus.ACTIVE },
      order: { 
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });

    for (let i = 0; i < entries.length; i++) {
      await em.update(IntelligentWaitlistEntry, entries[i].id, {
        position: i + 1,
        lastPositionUpdate: new Date(),
      });
    }
  }

  private async calculateEstimatedImpact(entries: IntelligentWaitlistEntry[]): Promise<any> {
    // Calculate estimated impact of bulk operations
    return {
      positionChanges: entries.length,
      notificationsSent: entries.length,
      estimatedRevenue: entries.reduce((sum, entry) => sum + (entry.maxPriceWilling || 0), 0),
    };
  }
}
