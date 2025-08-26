import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WalletPass, PassStatus } from '../entities/wallet-pass.entity';
import { PassUpdate, UpdateType, UpdateStatus } from '../entities/pass-update.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';
import { ApplePassKitService } from './apple-passkit.service';
import { GooglePayService } from './google-pay.service';
import { QRCodeService } from './qr-code.service';

export interface PassUpdateRequest {
  passIds: string[];
  updateType: UpdateType;
  updateData: any;
  scheduledFor?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notifyUsers?: boolean;
  batchId?: string;
}

export interface BulkUpdateResult {
  success: boolean;
  batchId: string;
  totalPasses: number;
  successfulUpdates: number;
  failedUpdates: number;
  results: Array<{
    passId: string;
    success: boolean;
    error?: string;
  }>;
}

@Injectable()
export class PassUpdateService {
  private readonly logger = new Logger(PassUpdateService.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassUpdate)
    private updateRepository: Repository<PassUpdate>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    @InjectQueue('pass-updates')
    private updateQueue: Queue,
    private applePassKitService: ApplePassKitService,
    private googlePayService: GooglePayService,
    private qrCodeService: QRCodeService,
  ) {}

  /**
   * Schedule pass update for event changes
   */
  async scheduleEventUpdate(
    eventId: string,
    eventChanges: any,
    scheduledFor?: Date
  ): Promise<{
    success: boolean;
    batchId: string;
    affectedPasses: number;
    error?: string;
  }> {
    this.logger.log(`Scheduling event update for event: ${eventId}`);

    try {
      // Find all passes for this event
      const passes = await this.passRepository.find({
        where: { eventId, status: PassStatus.ACTIVE },
      });

      if (passes.length === 0) {
        return {
          success: true,
          batchId: '',
          affectedPasses: 0,
        };
      }

      const batchId = this.generateBatchId();
      const passIds = passes.map(p => p.id);

      // Determine update type based on changes
      const updateType = this.determineUpdateType(eventChanges);

      // Schedule bulk update
      const result = await this.scheduleBulkUpdate({
        passIds,
        updateType,
        updateData: this.mapEventChangesToPassData(eventChanges),
        scheduledFor,
        priority: 'high',
        notifyUsers: true,
        batchId,
      });

      return {
        success: result.success,
        batchId: result.batchId,
        affectedPasses: passes.length,
      };
    } catch (error) {
      this.logger.error(`Failed to schedule event update: ${error.message}`);
      return {
        success: false,
        batchId: '',
        affectedPasses: 0,
        error: error.message,
      };
    }
  }

  /**
   * Schedule bulk pass updates
   */
  async scheduleBulkUpdate(request: PassUpdateRequest): Promise<BulkUpdateResult> {
    this.logger.log(`Scheduling bulk update for ${request.passIds.length} passes`);

    const batchId = request.batchId || this.generateBatchId();
    const results = [];
    let successfulUpdates = 0;
    let failedUpdates = 0;

    try {
      // Create update records for each pass
      for (const passId of request.passIds) {
        try {
          const updateRecord = await this.updateRepository.save({
            walletPassId: passId,
            updateType: request.updateType,
            status: UpdateStatus.PENDING,
            updateData: request.updateData,
            scheduledFor: request.scheduledFor || new Date(),
            metadata: {
              triggeredBy: 'system',
              updateSource: 'bulk_operation',
              batchId,
              priority: request.priority || 'normal',
              notifyUser: request.notifyUsers || false,
            },
          });

          // Add to queue
          await this.updateQueue.add(
            'process-pass-update',
            {
              updateId: updateRecord.id,
              passId,
              updateType: request.updateType,
              updateData: request.updateData,
              batchId,
            },
            {
              delay: request.scheduledFor ? request.scheduledFor.getTime() - Date.now() : 0,
              priority: this.getPriorityValue(request.priority || 'normal'),
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            }
          );

          results.push({
            passId,
            success: true,
          });
          successfulUpdates++;
        } catch (error) {
          this.logger.error(`Failed to schedule update for pass ${passId}: ${error.message}`);
          results.push({
            passId,
            success: false,
            error: error.message,
          });
          failedUpdates++;
        }
      }

      return {
        success: failedUpdates === 0,
        batchId,
        totalPasses: request.passIds.length,
        successfulUpdates,
        failedUpdates,
        results,
      };
    } catch (error) {
      this.logger.error(`Bulk update scheduling failed: ${error.message}`);
      return {
        success: false,
        batchId,
        totalPasses: request.passIds.length,
        successfulUpdates,
        failedUpdates,
        results,
      };
    }
  }

  /**
   * Process individual pass update
   */
  async processPassUpdate(updateId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    this.logger.log(`Processing pass update: ${updateId}`);

    try {
      const update = await this.updateRepository.findOne({
        where: { id: updateId },
        relations: ['walletPass'],
      });

      if (!update) {
        throw new Error('Update record not found');
      }

      // Mark as processing
      await this.updateRepository.update(updateId, {
        status: UpdateStatus.PROCESSING,
      });

      const walletPass = await this.passRepository.findOne({
        where: { id: update.walletPassId },
        relations: ['user', 'event', 'ticket'],
      });

      if (!walletPass) {
        throw new Error('Wallet pass not found');
      }

      // Process update based on pass type
      let updateResult;
      if (walletPass.passType === 'apple_wallet') {
        updateResult = await this.applePassKitService.updatePass(
          walletPass.id,
          update.updateData,
          update.updateType
        );
      } else if (walletPass.passType === 'google_pay') {
        updateResult = await this.googlePayService.updatePass(
          walletPass.id,
          update.updateData,
          update.updateType
        );
      } else {
        throw new Error(`Unsupported pass type: ${walletPass.passType}`);
      }

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Update failed');
      }

      // Update QR code if needed
      if (update.updateType === UpdateType.QR_CODE_UPDATE) {
        await this.qrCodeService.generateQRCodeData(walletPass.id);
      }

      // Mark as completed
      await this.updateRepository.update(updateId, {
        status: UpdateStatus.COMPLETED,
        processedAt: new Date(),
        processingResult: {
          success: true,
          updatedFields: updateResult.updatedFields,
        },
      });

      // Track analytics
      await this.trackAnalytics(walletPass.id, AnalyticsEventType.PASS_UPDATED);

      return { success: true };
    } catch (error) {
      this.logger.error(`Pass update processing failed: ${error.message}`);

      // Mark as failed and increment retry count
      const update = await this.updateRepository.findOne({ where: { id: updateId } });
      if (update) {
        await this.updateRepository.update(updateId, {
          status: UpdateStatus.FAILED,
          errorMessage: error.message,
          retryCount: update.retryCount + 1,
          processingResult: {
            success: false,
            errors: [error.message],
          },
        });

        // Schedule retry if within limits
        if (update.retryCount < update.maxRetries) {
          await this.scheduleRetry(updateId);
        }
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle real-time event changes
   */
  async handleEventChange(
    eventId: string,
    changeType: 'time' | 'venue' | 'cancellation' | 'postponement' | 'general',
    changeData: any
  ): Promise<{
    success: boolean;
    affectedPasses: number;
    batchId?: string;
    error?: string;
  }> {
    this.logger.log(`Handling event change: ${changeType} for event ${eventId}`);

    try {
      // Get all active passes for the event
      const passes = await this.passRepository.find({
        where: { eventId, status: PassStatus.ACTIVE },
      });

      if (passes.length === 0) {
        return {
          success: true,
          affectedPasses: 0,
        };
      }

      // Determine urgency based on change type
      const priority = this.getChangeTypePriority(changeType);
      const updateType = this.getUpdateTypeForChange(changeType);

      // Create immediate update for critical changes
      if (changeType === 'cancellation' || changeType === 'postponement') {
        const result = await this.scheduleBulkUpdate({
          passIds: passes.map(p => p.id),
          updateType,
          updateData: changeData,
          priority: 'urgent',
          notifyUsers: true,
        });

        return {
          success: result.success,
          affectedPasses: passes.length,
          batchId: result.batchId,
        };
      }

      // Schedule update with appropriate delay for non-critical changes
      const scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes delay
      const result = await this.scheduleBulkUpdate({
        passIds: passes.map(p => p.id),
        updateType,
        updateData: changeData,
        scheduledFor,
        priority,
        notifyUsers: true,
      });

      return {
        success: result.success,
        affectedPasses: passes.length,
        batchId: result.batchId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle event change: ${error.message}`);
      return {
        success: false,
        affectedPasses: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get update status for a batch
   */
  async getBatchUpdateStatus(batchId: string): Promise<{
    batchId: string;
    totalUpdates: number;
    completedUpdates: number;
    failedUpdates: number;
    pendingUpdates: number;
    processingUpdates: number;
    overallStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
    updates: Array<{
      passId: string;
      status: UpdateStatus;
      error?: string;
      processedAt?: Date;
    }>;
  }> {
    const updates = await this.updateRepository.find({
      where: { metadata: { batchId } as any },
      relations: ['walletPass'],
    });

    const statusCounts = updates.reduce((acc, update) => {
      acc[update.status] = (acc[update.status] || 0) + 1;
      return acc;
    }, {} as Record<UpdateStatus, number>);

    const totalUpdates = updates.length;
    const completedUpdates = statusCounts[UpdateStatus.COMPLETED] || 0;
    const failedUpdates = statusCounts[UpdateStatus.FAILED] || 0;
    const pendingUpdates = statusCounts[UpdateStatus.PENDING] || 0;
    const processingUpdates = statusCounts[UpdateStatus.PROCESSING] || 0;

    let overallStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
    if (completedUpdates === totalUpdates) {
      overallStatus = 'completed';
    } else if (failedUpdates === totalUpdates) {
      overallStatus = 'failed';
    } else if (processingUpdates > 0) {
      overallStatus = 'processing';
    } else if (pendingUpdates === totalUpdates) {
      overallStatus = 'pending';
    } else {
      overallStatus = 'partial';
    }

    return {
      batchId,
      totalUpdates,
      completedUpdates,
      failedUpdates,
      pendingUpdates,
      processingUpdates,
      overallStatus,
      updates: updates.map(update => ({
        passId: update.walletPassId,
        status: update.status,
        error: update.errorMessage,
        processedAt: update.processedAt,
      })),
    };
  }

  /**
   * Cancel pending updates
   */
  async cancelPendingUpdates(batchId: string): Promise<{
    success: boolean;
    cancelledCount: number;
    error?: string;
  }> {
    try {
      const result = await this.updateRepository.update(
        {
          metadata: { batchId } as any,
          status: UpdateStatus.PENDING,
        },
        {
          status: UpdateStatus.CANCELLED,
        }
      );

      // Remove from queue
      const jobs = await this.updateQueue.getJobs(['waiting', 'delayed']);
      const batchJobs = jobs.filter(job => job.data.batchId === batchId);
      
      for (const job of batchJobs) {
        await job.remove();
      }

      return {
        success: true,
        cancelledCount: result.affected || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel pending updates: ${error.message}`);
      return {
        success: false,
        cancelledCount: 0,
        error: error.message,
      };
    }
  }

  // Private helper methods

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineUpdateType(eventChanges: any): UpdateType {
    if (eventChanges.startDate || eventChanges.endDate) {
      return UpdateType.FIELD_UPDATE;
    }
    if (eventChanges.venue || eventChanges.address) {
      return UpdateType.LOCATION_UPDATE;
    }
    if (eventChanges.status === 'cancelled') {
      return UpdateType.STATUS_CHANGE;
    }
    return UpdateType.FIELD_UPDATE;
  }

  private mapEventChangesToPassData(eventChanges: any): any {
    const passData: any = {};

    if (eventChanges.name) {
      passData.eventName = eventChanges.name;
    }
    if (eventChanges.startDate) {
      passData.relevantDate = eventChanges.startDate;
    }
    if (eventChanges.venue) {
      passData.venue = eventChanges.venue;
    }
    if (eventChanges.address) {
      passData.address = eventChanges.address;
    }
    if (eventChanges.status === 'cancelled') {
      passData.voided = true;
      passData.status = 'EXPIRED';
    }

    return passData;
  }

  private getChangeTypePriority(changeType: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (changeType) {
      case 'cancellation':
      case 'postponement':
        return 'urgent';
      case 'time':
      case 'venue':
        return 'high';
      default:
        return 'normal';
    }
  }

  private getUpdateTypeForChange(changeType: string): UpdateType {
    switch (changeType) {
      case 'cancellation':
      case 'postponement':
        return UpdateType.STATUS_CHANGE;
      case 'venue':
        return UpdateType.LOCATION_UPDATE;
      case 'time':
        return UpdateType.FIELD_UPDATE;
      default:
        return UpdateType.FIELD_UPDATE;
    }
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent':
        return 1;
      case 'high':
        return 2;
      case 'normal':
        return 3;
      case 'low':
        return 4;
      default:
        return 3;
    }
  }

  private async scheduleRetry(updateId: string): Promise<void> {
    const update = await this.updateRepository.findOne({ where: { id: updateId } });
    if (!update) return;

    const delay = Math.pow(2, update.retryCount) * 1000; // Exponential backoff

    await this.updateQueue.add(
      'process-pass-update',
      {
        updateId,
        passId: update.walletPassId,
        updateType: update.updateType,
        updateData: update.updateData,
        retry: true,
      },
      {
        delay,
        priority: this.getPriorityValue(update.metadata?.priority || 'normal'),
        attempts: 1, // Single attempt for retries
      }
    );

    await this.updateRepository.update(updateId, {
      status: UpdateStatus.PENDING,
      errorMessage: null,
    });
  }

  private async trackAnalytics(passId: string, eventType: AnalyticsEventType): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to track analytics: ${error.message}`);
    }
  }
}
