import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackgroundSyncJob, SyncAction, SyncStatus, SyncPriority } from '../entities/background-sync.entity';
import { OfflineDataService } from './offline-data.service';
import { PWAAnalytics, PWAEventType } from '../entities/pwa-analytics.entity';

export interface SyncJobPayload {
  action: SyncAction;
  data: Record<string, any>;
  priority?: SyncPriority;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

export interface SyncJobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

@Injectable()
export class BackgroundSyncService {
  private readonly logger = new Logger(BackgroundSyncService.name);
  private readonly processingJobs = new Set<string>();

  constructor(
    @InjectRepository(BackgroundSyncJob)
    private syncJobRepository: Repository<BackgroundSyncJob>,
    @InjectRepository(PWAAnalytics)
    private analyticsRepository: Repository<PWAAnalytics>,
    private offlineDataService: OfflineDataService,
  ) {}

  async queueSyncJob(
    userId: string,
    payload: SyncJobPayload,
  ): Promise<BackgroundSyncJob> {
    const job = this.syncJobRepository.create({
      userId,
      action: payload.action,
      status: SyncStatus.QUEUED,
      priority: payload.priority || SyncPriority.NORMAL,
      payload: payload.data,
      maxRetries: payload.maxRetries || 3,
      metadata: payload.metadata,
    });

    const saved = await this.syncJobRepository.save(job);

    // Process high priority jobs immediately
    if (payload.priority === SyncPriority.CRITICAL) {
      setImmediate(() => this.processSyncJob(saved.id));
    }

    return saved;
  }

  async processSyncJob(jobId: string): Promise<SyncJobResult> {
    if (this.processingJobs.has(jobId)) {
      return { success: false, error: 'Job already processing' };
    }

    this.processingJobs.add(jobId);

    try {
      const job = await this.syncJobRepository.findOne({
        where: { id: jobId },
        relations: ['user'],
      });

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      if (job.status !== SyncStatus.QUEUED && job.status !== SyncStatus.RETRYING) {
        return { success: false, error: 'Job not in processable state' };
      }

      // Update job status
      await this.syncJobRepository.update(jobId, {
        status: SyncStatus.PROCESSING,
        startedAt: new Date(),
      });

      const startTime = Date.now();
      const result = await this.executeSync(job);
      const duration = Date.now() - startTime;

      // Update job with result
      await this.syncJobRepository.update(jobId, {
        status: result.success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        result: result.data,
        errorMessage: result.error,
        completedAt: new Date(),
        processingDuration: duration,
        nextRetryAt: result.success ? null : this.calculateNextRetry(job.retryCount),
      });

      // Track sync analytics
      await this.trackAnalytics(job.userId, PWAEventType.BACKGROUND_SYNC, {
        action: job.action,
        success: result.success,
        duration,
        retryCount: job.retryCount,
      });

      return { ...result, duration };

    } catch (error) {
      this.logger.error(`Sync job ${jobId} failed:`, error);

      await this.syncJobRepository.update(jobId, {
        status: SyncStatus.FAILED,
        errorMessage: error.message,
        completedAt: new Date(),
      });

      return { success: false, error: error.message };

    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private async executeSync(job: BackgroundSyncJob): Promise<SyncJobResult> {
    switch (job.action) {
      case SyncAction.TICKET_PURCHASE:
        return this.syncTicketPurchase(job);
      case SyncAction.PROFILE_UPDATE:
        return this.syncProfileUpdate(job);
      case SyncAction.EVENT_FAVORITE:
        return this.syncEventFavorite(job);
      case SyncAction.EVENT_UNFAVORITE:
        return this.syncEventUnfavorite(job);
      case SyncAction.REVIEW_SUBMIT:
        return this.syncReviewSubmit(job);
      case SyncAction.RATING_SUBMIT:
        return this.syncRatingSubmit(job);
      case SyncAction.WAITLIST_JOIN:
        return this.syncWaitlistJoin(job);
      case SyncAction.NOTIFICATION_PREFERENCE:
        return this.syncNotificationPreference(job);
      case SyncAction.SEARCH_HISTORY:
        return this.syncSearchHistory(job);
      case SyncAction.INTERACTION_TRACKING:
        return this.syncInteractionTracking(job);
      default:
        throw new Error(`Unknown sync action: ${job.action}`);
    }
  }

  private async syncTicketPurchase(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for ticket purchase sync
    // In real implementation, this would call the ticket service
    this.logger.log(`Syncing ticket purchase for user ${job.userId}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      data: {
        ticketId: job.payload.ticketId,
        status: 'confirmed',
        syncedAt: new Date(),
      },
    };
  }

  private async syncProfileUpdate(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for profile update sync
    this.logger.log(`Syncing profile update for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        profileUpdated: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncEventFavorite(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for event favorite sync
    this.logger.log(`Syncing event favorite for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        eventId: job.payload.eventId,
        favorited: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncEventUnfavorite(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for event unfavorite sync
    this.logger.log(`Syncing event unfavorite for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        eventId: job.payload.eventId,
        favorited: false,
        syncedAt: new Date(),
      },
    };
  }

  private async syncReviewSubmit(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for review submit sync
    this.logger.log(`Syncing review submit for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        reviewId: job.payload.reviewId,
        submitted: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncRatingSubmit(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for rating submit sync
    this.logger.log(`Syncing rating submit for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        ratingId: job.payload.ratingId,
        submitted: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncWaitlistJoin(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for waitlist join sync
    this.logger.log(`Syncing waitlist join for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        eventId: job.payload.eventId,
        waitlisted: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncNotificationPreference(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for notification preference sync
    this.logger.log(`Syncing notification preferences for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        preferencesUpdated: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncSearchHistory(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for search history sync
    this.logger.log(`Syncing search history for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        searchHistoryUpdated: true,
        syncedAt: new Date(),
      },
    };
  }

  private async syncInteractionTracking(job: BackgroundSyncJob): Promise<SyncJobResult> {
    // Placeholder for interaction tracking sync
    this.logger.log(`Syncing interaction tracking for user ${job.userId}`);
    
    return {
      success: true,
      data: {
        interactionsTracked: true,
        syncedAt: new Date(),
      },
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueuedJobs(): Promise<void> {
    const queuedJobs = await this.syncJobRepository.find({
      where: {
        status: In([SyncStatus.QUEUED, SyncStatus.RETRYING]),
        isActive: true,
      },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: 10,
    });

    const processingPromises = queuedJobs.map(job => this.processSyncJob(job.id));
    await Promise.allSettled(processingPromises);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedJobs(): Promise<void> {
    const now = new Date();
    const retryableJobs = await this.syncJobRepository.find({
      where: {
        status: SyncStatus.FAILED,
        nextRetryAt: LessThan(now),
        isActive: true,
      },
      take: 20,
    });

    for (const job of retryableJobs) {
      if (job.retryCount < job.maxRetries) {
        await this.syncJobRepository.update(job.id, {
          status: SyncStatus.RETRYING,
          retryCount: job.retryCount + 1,
        });
      } else {
        await this.syncJobRepository.update(job.id, {
          isActive: false,
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupCompletedJobs(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await this.syncJobRepository.delete({
      status: SyncStatus.COMPLETED,
      completedAt: LessThan(sevenDaysAgo),
    });
  }

  async getSyncJobStatus(jobId: string): Promise<BackgroundSyncJob | null> {
    return this.syncJobRepository.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
  }

  async getUserSyncJobs(
    userId: string,
    status?: SyncStatus,
    limit = 50,
  ): Promise<BackgroundSyncJob[]> {
    const query = this.syncJobRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId })
      .orderBy('job.createdAt', 'DESC')
      .limit(limit);

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    return query.getMany();
  }

  async getSyncMetrics(userId?: string): Promise<Record<string, any>> {
    const query = this.syncJobRepository.createQueryBuilder('job');

    if (userId) {
      query.where('job.userId = :userId', { userId });
    }

    const [total, completed, failed, pending] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('job.status = :status', { status: SyncStatus.COMPLETED }).getCount(),
      query.clone().andWhere('job.status = :status', { status: SyncStatus.FAILED }).getCount(),
      query.clone().andWhere('job.status IN (:...statuses)', { 
        statuses: [SyncStatus.QUEUED, SyncStatus.PROCESSING, SyncStatus.RETRYING] 
      }).getCount(),
    ]);

    const avgProcessingTime = await query
      .select('AVG(job.processingDuration)', 'avg')
      .where('job.processingDuration IS NOT NULL')
      .getRawOne();

    return {
      total,
      completed,
      failed,
      pending,
      successRate: total > 0 ? completed / total : 0,
      failureRate: total > 0 ? failed / total : 0,
      averageProcessingTime: parseFloat(avgProcessingTime?.avg || '0'),
    };
  }

  private calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
    const delays = [60, 300, 900, 1800, 3600];
    const delaySeconds = delays[Math.min(retryCount, delays.length - 1)];
    
    const nextRetry = new Date();
    nextRetry.setSeconds(nextRetry.getSeconds() + delaySeconds);
    
    return nextRetry;
  }

  private async trackAnalytics(
    userId: string,
    eventType: PWAEventType,
    eventData?: Record<string, any>,
  ): Promise<void> {
    try {
      const analytics = this.analyticsRepository.create({
        userId,
        sessionId: `sync-${Date.now()}`,
        eventType,
        eventData,
        isOnline: true,
      });

      await this.analyticsRepository.save(analytics);
    } catch (error) {
      this.logger.error('Failed to track analytics:', error);
    }
  }
}
