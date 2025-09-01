import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PushNotificationService } from '../services/push-notification.service';
import { OfflineDataService } from '../services/offline-data.service';
import { BackgroundSyncService } from '../services/background-sync.service';
import { PWAAnalyticsService } from '../services/pwa-analytics.service';
import { PWAEventType } from '../entities/pwa-analytics.entity';

export class SubscribeToPushDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

export class CacheDataDto {
  dataType: string;
  data: Record<string, any>;
  expiresAt?: Date;
  tags?: string[];
}

export class SyncJobDto {
  action: string;
  data: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

export class TrackEventDto {
  eventType: PWAEventType;
  sessionId: string;
  url?: string;
  deviceInfo?: Record<string, any>;
  performanceMetrics?: Record<string, any>;
  eventData?: Record<string, any>;
}

@ApiTags('PWA')
@Controller('pwa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PWAController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly offlineDataService: OfflineDataService,
    private readonly backgroundSyncService: BackgroundSyncService,
    private readonly analyticsService: PWAAnalyticsService,
  ) {}

  // Push Notification Endpoints
  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 201, description: 'Successfully subscribed to push notifications' })
  async subscribeToPush(@Request() req, @Body() subscribeDto: SubscribeToPushDto) {
    return this.pushNotificationService.subscribe(
      req.user.id,
      subscribeDto.endpoint,
      subscribeDto.keys,
      subscribeDto.userAgent,
      subscribeDto.deviceInfo,
    );
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed from push notifications' })
  @HttpCode(HttpStatus.OK)
  async unsubscribeFromPush(@Request() req, @Query('endpoint') endpoint?: string) {
    return this.pushNotificationService.unsubscribe(req.user.id, endpoint);
  }

  @Get('push/subscriptions')
  @ApiOperation({ summary: 'Get user push subscriptions' })
  @ApiResponse({ status: 200, description: 'List of user push subscriptions' })
  async getPushSubscriptions(@Request() req) {
    return this.pushNotificationService.getUserSubscriptions(req.user.id);
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Send test push notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(@Request() req) {
    return this.pushNotificationService.sendNotification(req.user.id, {
      title: 'Test Notification',
      body: 'This is a test notification from Veritix PWA',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
    });
  }

  // Offline Data Endpoints
  @Post('offline/cache')
  @ApiOperation({ summary: 'Cache data for offline access' })
  @ApiResponse({ status: 201, description: 'Data cached successfully' })
  async cacheData(@Request() req, @Body() cacheDto: CacheDataDto) {
    return this.offlineDataService.cacheData(
      req.user.id,
      cacheDto.dataType,
      cacheDto.data,
      cacheDto.expiresAt,
      cacheDto.tags,
    );
  }

  @Get('offline/cache/:dataType')
  @ApiOperation({ summary: 'Get cached data by type' })
  @ApiResponse({ status: 200, description: 'Cached data retrieved' })
  async getCachedData(@Request() req, @Param('dataType') dataType: string) {
    return this.offlineDataService.getCachedData(req.user.id, dataType);
  }

  @Delete('offline/cache/:dataType')
  @ApiOperation({ summary: 'Clear cached data by type' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  @HttpCode(HttpStatus.OK)
  async clearCache(@Request() req, @Param('dataType') dataType: string) {
    return this.offlineDataService.invalidateCache(req.user.id, dataType);
  }

  @Get('offline/sync-status')
  @ApiOperation({ summary: 'Get offline data sync status' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async getSyncStatus(@Request() req) {
    const pendingData = await this.offlineDataService.getPendingSyncData(req.user.id);
    return {
      pendingItems: pendingData.length,
      items: pendingData.map(item => ({
        id: item.id,
        dataType: item.dataType,
        lastModified: item.lastModified,
        syncAttempts: item.syncAttempts,
      })),
    };
  }

  @Post('offline/sync')
  @ApiOperation({ summary: 'Trigger manual sync of offline data' })
  @ApiResponse({ status: 200, description: 'Sync initiated' })
  async triggerSync(@Request() req) {
    return this.offlineDataService.syncPendingData(req.user.id);
  }

  // Background Sync Endpoints
  @Post('sync/queue')
  @ApiOperation({ summary: 'Queue background sync job' })
  @ApiResponse({ status: 201, description: 'Sync job queued successfully' })
  async queueSyncJob(@Request() req, @Body() syncDto: SyncJobDto) {
    return this.backgroundSyncService.queueJob(
      req.user.id,
      syncDto.action,
      syncDto.data,
      syncDto.priority || 'medium',
      syncDto.scheduledFor,
    );
  }

  @Get('sync/jobs')
  @ApiOperation({ summary: 'Get user background sync jobs' })
  @ApiResponse({ status: 200, description: 'List of sync jobs' })
  async getSyncJobs(@Request() req, @Query('status') status?: string) {
    return this.backgroundSyncService.getUserJobs(req.user.id, status as any);
  }

  @Delete('sync/jobs/:jobId')
  @ApiOperation({ summary: 'Cancel background sync job' })
  @ApiResponse({ status: 200, description: 'Sync job cancelled' })
  @HttpCode(HttpStatus.OK)
  async cancelSyncJob(@Request() req, @Param('jobId') jobId: string) {
    // Add authorization check to ensure user owns the job
    const job = await this.backgroundSyncService.getUserJobs(req.user.id);
    const userJob = job.find(j => j.id === jobId);
    
    if (!userJob) {
      throw new BadRequestException('Job not found or access denied');
    }

    return this.backgroundSyncService.cancelJob(jobId);
  }

  @Post('sync/retry/:jobId')
  @ApiOperation({ summary: 'Retry failed background sync job' })
  @ApiResponse({ status: 200, description: 'Sync job retried' })
  async retrySyncJob(@Request() req, @Param('jobId') jobId: string) {
    // Add authorization check
    const job = await this.backgroundSyncService.getUserJobs(req.user.id);
    const userJob = job.find(j => j.id === jobId);
    
    if (!userJob) {
      throw new BadRequestException('Job not found or access denied');
    }

    return this.backgroundSyncService.retryJob(jobId);
  }

  // Analytics Endpoints
  @Post('analytics/track')
  @ApiOperation({ summary: 'Track PWA analytics event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(@Request() req, @Body() trackDto: TrackEventDto) {
    return this.analyticsService.trackEvent(
      req.user.id,
      trackDto.eventType,
      trackDto.sessionId,
      {
        url: trackDto.url,
        ...trackDto.deviceInfo,
        performanceMetrics: trackDto.performanceMetrics,
        eventData: trackDto.eventData,
      },
    );
  }

  @Get('analytics/user')
  @ApiOperation({ summary: 'Get user PWA analytics' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved' })
  async getUserAnalytics(@Request() req, @Query('days') days?: string) {
    const dayCount = days ? parseInt(days) : 30;
    return this.analyticsService.getUserMetrics(req.user.id, dayCount);
  }

  // PWA Status and Health Endpoints
  @Get('status')
  @ApiOperation({ summary: 'Get PWA status for user' })
  @ApiResponse({ status: 200, description: 'PWA status retrieved' })
  async getPWAStatus(@Request() req) {
    const [subscriptions, cachedData, syncJobs] = await Promise.all([
      this.pushNotificationService.getUserSubscriptions(req.user.id),
      this.offlineDataService.getCachedData(req.user.id),
      this.backgroundSyncService.getUserJobs(req.user.id),
    ]);

    const pendingSyncJobs = syncJobs.filter(job => job.status === 'pending' || job.status === 'processing');

    return {
      pushNotifications: {
        subscribed: subscriptions.length > 0,
        activeSubscriptions: subscriptions.filter(sub => sub.isActive).length,
        totalSubscriptions: subscriptions.length,
      },
      offlineData: {
        totalCachedItems: cachedData.length,
        pendingSyncItems: cachedData.filter(item => item.needsSync).length,
        cacheSize: cachedData.reduce((sum, item) => sum + (item.data ? JSON.stringify(item.data).length : 0), 0),
      },
      backgroundSync: {
        pendingJobs: pendingSyncJobs.length,
        totalJobs: syncJobs.length,
        failedJobs: syncJobs.filter(job => job.status === 'failed').length,
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'PWA health check' })
  @ApiResponse({ status: 200, description: 'PWA health status' })
  async getHealthStatus() {
    // Basic health check for PWA services
    try {
      const [pushHealth, offlineHealth, syncHealth] = await Promise.all([
        this.checkPushServiceHealth(),
        this.checkOfflineServiceHealth(),
        this.checkSyncServiceHealth(),
      ]);

      return {
        status: 'healthy',
        services: {
          pushNotifications: pushHealth,
          offlineData: offlineHealth,
          backgroundSync: syncHealth,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  private async checkPushServiceHealth(): Promise<{ status: string; details?: any }> {
    try {
      // Check if we can access the subscription repository
      const recentSubscriptions = await this.pushNotificationService.getUserSubscriptions('health-check');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', details: error.message };
    }
  }

  private async checkOfflineServiceHealth(): Promise<{ status: string; details?: any }> {
    try {
      // Check if we can access cached data
      const cachedData = await this.offlineDataService.getCachedData('health-check');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', details: error.message };
    }
  }

  private async checkSyncServiceHealth(): Promise<{ status: string; details?: any }> {
    try {
      // Check if we can access sync jobs
      const jobs = await this.backgroundSyncService.getUserJobs('health-check');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', details: error.message };
    }
  }
}
