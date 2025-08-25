import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassUpdateService } from '../services/pass-update.service';
import { ApplePassKitService } from '../services/apple-passkit.service';
import { GooglePayService } from '../services/google-pay.service';
import { GeolocationNotificationService } from '../services/geolocation-notification.service';
import { PassSharingService } from '../services/pass-sharing.service';
import { WalletPass } from '../entities/wallet-pass.entity';
import { PassUpdate, UpdateStatus } from '../entities/pass-update.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

export interface PassUpdateJobData {
  updateId: string;
  passId: string;
  updateType: string;
  updateData: any;
  batchId?: string;
  retry?: boolean;
}

export interface PassNotificationJobData {
  passId: string;
  userId: string;
  notificationType: 'location' | 'beacon' | 'update' | 'share' | 'expiry';
  title: string;
  body: string;
  data?: any;
}

export interface PassMaintenanceJobData {
  type: 'cleanup_expired' | 'update_analytics' | 'sync_passes' | 'optimize_storage';
  organizerId?: string;
  daysOld?: number;
}

@Injectable()
@Processor('pass-updates')
export class PassUpdateProcessor {
  private readonly logger = new Logger(PassUpdateProcessor.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassUpdate)
    private updateRepository: Repository<PassUpdate>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    private passUpdateService: PassUpdateService,
    private applePassKitService: ApplePassKitService,
    private googlePayService: GooglePayService,
    private geolocationService: GeolocationNotificationService,
    private passSharingService: PassSharingService,
  ) {}

  @Process('process-pass-update')
  async processPassUpdate(job: Job<PassUpdateJobData>) {
    this.logger.log(`Processing pass update job: ${job.id}`);

    try {
      const { updateId, passId, updateType, updateData, batchId, retry } = job.data;

      // Update job progress
      await job.progress(10);

      const result = await this.passUpdateService.processPassUpdate(updateId);

      await job.progress(100);

      if (result.success) {
        this.logger.log(`Pass update completed successfully: ${updateId}`);
        return { success: true, updateId, passId };
      } else {
        throw new Error(result.error || 'Update processing failed');
      }
    } catch (error) {
      this.logger.error(`Pass update job failed: ${error.message}`);
      throw error;
    }
  }

  @Process('batch-pass-update')
  async processBatchUpdate(job: Job<{ batchId: string; passIds: string[]; updateData: any }>) {
    this.logger.log(`Processing batch update: ${job.data.batchId}`);

    try {
      const { batchId, passIds, updateData } = job.data;
      const results = [];
      let processed = 0;

      for (const passId of passIds) {
        try {
          // Process individual pass update
          const result = await this.processIndividualPassUpdate(passId, updateData);
          results.push({ passId, success: true, result });
        } catch (error) {
          this.logger.error(`Failed to update pass ${passId}: ${error.message}`);
          results.push({ passId, success: false, error: error.message });
        }

        processed++;
        await job.progress((processed / passIds.length) * 100);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.log(`Batch update completed: ${successful} successful, ${failed} failed`);

      return {
        batchId,
        totalPasses: passIds.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      this.logger.error(`Batch update failed: ${error.message}`);
      throw error;
    }
  }

  @Process('smart-pass-release')
  async processSmartPassRelease(job: Job<{ eventId: string; releaseCount: number; criteria: any }>) {
    this.logger.log(`Processing smart pass release for event: ${job.data.eventId}`);

    try {
      const { eventId, releaseCount, criteria } = job.data;

      // Find eligible passes based on criteria
      const eligiblePasses = await this.findEligiblePasses(eventId, criteria);

      if (eligiblePasses.length === 0) {
        return { success: true, releasedCount: 0, message: 'No eligible passes found' };
      }

      // Sort passes by priority/criteria
      const sortedPasses = this.sortPassesByPriority(eligiblePasses, criteria);

      // Release passes up to the specified count
      const passesToRelease = sortedPasses.slice(0, Math.min(releaseCount, sortedPasses.length));
      const results = [];

      for (let i = 0; i < passesToRelease.length; i++) {
        const pass = passesToRelease[i];
        
        try {
          await this.releasePassToUser(pass, criteria);
          results.push({ passId: pass.id, success: true });
        } catch (error) {
          this.logger.error(`Failed to release pass ${pass.id}: ${error.message}`);
          results.push({ passId: pass.id, success: false, error: error.message });
        }

        await job.progress(((i + 1) / passesToRelease.length) * 100);
      }

      const successful = results.filter(r => r.success).length;

      return {
        success: true,
        releasedCount: successful,
        totalEligible: eligiblePasses.length,
        results,
      };
    } catch (error) {
      this.logger.error(`Smart pass release failed: ${error.message}`);
      throw error;
    }
  }

  @Process('cleanup-expired-passes')
  async cleanupExpiredPasses(job: Job<PassMaintenanceJobData>) {
    this.logger.log('Starting cleanup of expired passes');

    try {
      const { daysOld = 30, organizerId } = job.data;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let whereClause: any = {
        expiresAt: { $lt: new Date() } as any,
        updatedAt: { $lt: cutoffDate } as any,
      };

      if (organizerId) {
        whereClause.event = { organizerId };
      }

      // Find expired passes
      const expiredPasses = await this.passRepository.find({
        where: whereClause,
        relations: ['event'],
      });

      await job.progress(25);

      let cleanedCount = 0;
      let archivedCount = 0;

      for (const pass of expiredPasses) {
        try {
          // Archive analytics data
          await this.archivePassAnalytics(pass.id);
          archivedCount++;

          // Update pass status
          await this.passRepository.update(pass.id, {
            status: 'EXPIRED' as any,
            metadata: {
              ...pass.metadata,
              cleanedAt: new Date(),
              cleanupReason: 'expired_automatic',
            },
          });

          cleanedCount++;
        } catch (error) {
          this.logger.error(`Failed to cleanup pass ${pass.id}: ${error.message}`);
        }
      }

      await job.progress(75);

      // Clean up old update records
      const oldUpdates = await this.updateRepository.find({
        where: {
          createdAt: { $lt: cutoffDate } as any,
          status: UpdateStatus.COMPLETED,
        },
      });

      let deletedUpdates = 0;
      for (const update of oldUpdates) {
        try {
          await this.updateRepository.remove(update);
          deletedUpdates++;
        } catch (error) {
          this.logger.error(`Failed to delete update record ${update.id}: ${error.message}`);
        }
      }

      await job.progress(100);

      this.logger.log(`Cleanup completed: ${cleanedCount} passes cleaned, ${archivedCount} analytics archived, ${deletedUpdates} update records deleted`);

      return {
        success: true,
        cleanedPasses: cleanedCount,
        archivedAnalytics: archivedCount,
        deletedUpdates,
      };
    } catch (error) {
      this.logger.error(`Cleanup job failed: ${error.message}`);
      throw error;
    }
  }

  @Process('update-pass-analytics')
  async updatePassAnalytics(job: Job<PassMaintenanceJobData>) {
    this.logger.log('Starting pass analytics update');

    try {
      const { organizerId } = job.data;

      let whereClause: any = {};
      if (organizerId) {
        whereClause.event = { organizerId };
      }

      const passes = await this.passRepository.find({
        where: whereClause,
        relations: ['analytics'],
      });

      await job.progress(25);

      let updatedCount = 0;

      for (const pass of passes) {
        try {
          // Calculate engagement metrics
          const engagementMetrics = await this.calculatePassEngagement(pass.id);

          // Update pass with calculated metrics
          await this.passRepository.update(pass.id, {
            metadata: {
              ...pass.metadata,
              engagementMetrics,
              lastAnalyticsUpdate: new Date(),
            },
          });

          updatedCount++;
        } catch (error) {
          this.logger.error(`Failed to update analytics for pass ${pass.id}: ${error.message}`);
        }
      }

      await job.progress(100);

      this.logger.log(`Analytics update completed: ${updatedCount} passes updated`);

      return {
        success: true,
        updatedPasses: updatedCount,
      };
    } catch (error) {
      this.logger.error(`Analytics update job failed: ${error.message}`);
      throw error;
    }
  }

  @Process('sync-wallet-passes')
  async syncWalletPasses(job: Job<{ passIds?: string[]; forceSync?: boolean }>) {
    this.logger.log('Starting wallet pass synchronization');

    try {
      const { passIds, forceSync = false } = job.data;

      let passes: WalletPass[];
      if (passIds) {
        passes = await this.passRepository.find({
          where: { id: { $in: passIds } as any },
          relations: ['user', 'event', 'ticket'],
        });
      } else {
        // Sync passes that haven't been synced in the last hour
        const syncCutoff = new Date();
        syncCutoff.setHours(syncCutoff.getHours() - 1);

        passes = await this.passRepository.find({
          where: forceSync ? {} : {
            lastUpdated: { $lt: syncCutoff } as any,
          },
          relations: ['user', 'event', 'ticket'],
          take: 100, // Limit to prevent overwhelming the system
        });
      }

      await job.progress(25);

      let syncedCount = 0;
      let failedCount = 0;

      for (const pass of passes) {
        try {
          // Sync with Apple Wallet
          if (pass.passType === 'apple_wallet') {
            await this.applePassKitService.updatePass(pass.id, {}, 'FIELD_UPDATE' as any);
          }

          // Sync with Google Pay
          if (pass.passType === 'google_pay') {
            await this.googlePayService.updatePass(pass.id, {}, 'FIELD_UPDATE' as any);
          }

          await this.passRepository.update(pass.id, {
            lastUpdated: new Date(),
          });

          syncedCount++;
        } catch (error) {
          this.logger.error(`Failed to sync pass ${pass.id}: ${error.message}`);
          failedCount++;
        }
      }

      await job.progress(100);

      this.logger.log(`Pass sync completed: ${syncedCount} synced, ${failedCount} failed`);

      return {
        success: true,
        syncedPasses: syncedCount,
        failedPasses: failedCount,
        totalPasses: passes.length,
      };
    } catch (error) {
      this.logger.error(`Pass sync job failed: ${error.message}`);
      throw error;
    }
  }

  @Process('optimize-pass-storage')
  async optimizePassStorage(job: Job<PassMaintenanceJobData>) {
    this.logger.log('Starting pass storage optimization');

    try {
      const { organizerId, daysOld = 90 } = job.data;

      // Find passes with large metadata that can be compressed
      let whereClause: any = {};
      if (organizerId) {
        whereClause.event = { organizerId };
      }

      const passes = await this.passRepository.find({
        where: whereClause,
      });

      await job.progress(25);

      let optimizedCount = 0;
      let spaceSaved = 0;

      for (const pass of passes) {
        try {
          const originalSize = JSON.stringify(pass.metadata || {}).length;

          // Optimize metadata by removing unnecessary fields
          const optimizedMetadata = this.optimizePassMetadata(pass.metadata);

          const newSize = JSON.stringify(optimizedMetadata).length;
          const saved = originalSize - newSize;

          if (saved > 0) {
            await this.passRepository.update(pass.id, {
              metadata: optimizedMetadata,
            });

            optimizedCount++;
            spaceSaved += saved;
          }
        } catch (error) {
          this.logger.error(`Failed to optimize pass ${pass.id}: ${error.message}`);
        }
      }

      await job.progress(75);

      // Clean up old analytics data
      const oldAnalyticsCutoff = new Date();
      oldAnalyticsCutoff.setDate(oldAnalyticsCutoff.getDate() - daysOld);

      const oldAnalytics = await this.analyticsRepository.find({
        where: {
          timestamp: { $lt: oldAnalyticsCutoff } as any,
        },
      });

      let deletedAnalytics = 0;
      for (const analytics of oldAnalytics) {
        try {
          await this.analyticsRepository.remove(analytics);
          deletedAnalytics++;
        } catch (error) {
          this.logger.error(`Failed to delete analytics ${analytics.id}: ${error.message}`);
        }
      }

      await job.progress(100);

      this.logger.log(`Storage optimization completed: ${optimizedCount} passes optimized, ${spaceSaved} bytes saved, ${deletedAnalytics} old analytics deleted`);

      return {
        success: true,
        optimizedPasses: optimizedCount,
        spaceSavedBytes: spaceSaved,
        deletedAnalytics,
      };
    } catch (error) {
      this.logger.error(`Storage optimization job failed: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async processIndividualPassUpdate(passId: string, updateData: any): Promise<any> {
    const pass = await this.passRepository.findOne({
      where: { id: passId },
      relations: ['user', 'event', 'ticket'],
    });

    if (!pass) {
      throw new Error('Pass not found');
    }

    // Update based on pass type
    if (pass.passType === 'apple_wallet') {
      return await this.applePassKitService.updatePass(passId, updateData);
    } else if (pass.passType === 'google_pay') {
      return await this.googlePayService.updatePass(passId, updateData);
    }

    throw new Error(`Unsupported pass type: ${pass.passType}`);
  }

  private async findEligiblePasses(eventId: string, criteria: any): Promise<WalletPass[]> {
    const whereClause: any = {
      eventId,
      status: 'ACTIVE',
    };

    // Apply additional criteria
    if (criteria.minEngagement) {
      whereClause.metadata = {
        engagementScore: { $gte: criteria.minEngagement } as any,
      };
    }

    if (criteria.userTier) {
      whereClause.user = {
        tier: criteria.userTier,
      };
    }

    return await this.passRepository.find({
      where: whereClause,
      relations: ['user', 'event'],
    });
  }

  private sortPassesByPriority(passes: WalletPass[], criteria: any): WalletPass[] {
    return passes.sort((a, b) => {
      // Sort by engagement score (higher first)
      const aEngagement = a.metadata?.engagementScore || 0;
      const bEngagement = b.metadata?.engagementScore || 0;

      if (aEngagement !== bEngagement) {
        return bEngagement - aEngagement;
      }

      // Sort by creation date (older first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private async releasePassToUser(pass: WalletPass, criteria: any): Promise<void> {
    // Update pass status
    await this.passRepository.update(pass.id, {
      status: 'ACTIVE' as any,
      metadata: {
        ...pass.metadata,
        releasedAt: new Date(),
        releaseReason: criteria.reason || 'smart_release',
      },
    });

    // Track analytics
    await this.analyticsRepository.save({
      walletPassId: pass.id,
      eventType: AnalyticsEventType.PASS_UPDATED,
      timestamp: new Date(),
      eventData: {
        updateType: 'smart_release',
        criteria,
      },
    });
  }

  private async archivePassAnalytics(passId: string): Promise<void> {
    const analytics = await this.analyticsRepository.find({
      where: { walletPassId: passId },
    });

    // In a real implementation, you might move these to an archive table or cold storage
    for (const analytic of analytics) {
      analytic.metadata = {
        ...analytic.metadata,
        archived: true,
        archivedAt: new Date(),
      };
      await this.analyticsRepository.save(analytic);
    }
  }

  private async calculatePassEngagement(passId: string): Promise<any> {
    const analytics = await this.analyticsRepository.find({
      where: { walletPassId: passId },
    });

    const views = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_VIEWED).length;
    const shares = analytics.filter(a => a.eventType === AnalyticsEventType.PASS_SHARED).length;
    const qrScans = analytics.filter(a => a.eventType === AnalyticsEventType.QR_CODE_SCANNED).length;
    const locationTriggers = analytics.filter(a => a.eventType === AnalyticsEventType.LOCATION_TRIGGERED).length;

    const engagementScore = (views * 1) + (shares * 3) + (qrScans * 2) + (locationTriggers * 1.5);

    return {
      views,
      shares,
      qrScans,
      locationTriggers,
      engagementScore,
      lastCalculated: new Date(),
    };
  }

  private optimizePassMetadata(metadata: any): any {
    if (!metadata) return {};

    const optimized = { ...metadata };

    // Remove large temporary data
    delete optimized.tempData;
    delete optimized.debugInfo;
    delete optimized.rawAnalytics;

    // Compress analytics history (keep only recent entries)
    if (optimized.analyticsHistory && Array.isArray(optimized.analyticsHistory)) {
      optimized.analyticsHistory = optimized.analyticsHistory.slice(-50); // Keep last 50 entries
    }

    // Remove duplicate entries from arrays
    if (optimized.shareHistory && Array.isArray(optimized.shareHistory)) {
      optimized.shareHistory = optimized.shareHistory.filter((item, index, arr) => 
        arr.findIndex(i => i.shareToken === item.shareToken) === index
      );
    }

    return optimized;
  }
}
