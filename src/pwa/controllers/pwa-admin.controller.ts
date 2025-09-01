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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PushNotificationService } from '../services/push-notification.service';
import { OfflineDataService } from '../services/offline-data.service';
import { BackgroundSyncService } from '../services/background-sync.service';
import { PWAAnalyticsService, AnalyticsFilter } from '../services/pwa-analytics.service';

export class BulkNotificationDto {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  scheduledFor?: Date;
}

export class CacheManagementDto {
  action: 'clear' | 'refresh' | 'invalidate';
  dataType?: string;
  userIds?: string[];
  tags?: string[];
}

@ApiTags('PWA Admin')
@Controller('admin/pwa')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PWAAdminController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly offlineDataService: OfflineDataService,
    private readonly backgroundSyncService: BackgroundSyncService,
    private readonly analyticsService: PWAAnalyticsService,
  ) {}

  // Push Notification Management
  @Post('notifications/bulk')
  @ApiOperation({ summary: 'Send bulk push notifications' })
  @ApiResponse({ status: 201, description: 'Bulk notifications queued' })
  async sendBulkNotifications(@Body() bulkDto: BulkNotificationDto) {
    return this.pushNotificationService.sendBulkNotifications(
      bulkDto.userIds,
      {
        title: bulkDto.title,
        body: bulkDto.body,
        icon: bulkDto.icon,
        badge: bulkDto.badge,
        data: bulkDto.data,
        actions: bulkDto.actions,
      },
      bulkDto.scheduledFor,
    );
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get all push notifications' })
  @ApiResponse({ status: 200, description: 'List of push notifications' })
  async getAllNotifications(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.pushNotificationService.getNotifications({
      status: status as any,
      userId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('notifications/analytics')
  @ApiOperation({ summary: 'Get push notification analytics' })
  @ApiResponse({ status: 200, description: 'Notification analytics' })
  async getNotificationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.pushNotificationService.getNotificationAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all push subscriptions' })
  @ApiResponse({ status: 200, description: 'List of push subscriptions' })
  async getAllSubscriptions(
    @Query('isActive') isActive?: string,
    @Query('deviceType') deviceType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.pushNotificationService.getAllSubscriptions({
      isActive: isActive ? isActive === 'true' : undefined,
      deviceType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  // Cache Management
  @Post('cache/manage')
  @ApiOperation({ summary: 'Manage cached data' })
  @ApiResponse({ status: 200, description: 'Cache management operation completed' })
  async manageCache(@Body() cacheDto: CacheManagementDto) {
    switch (cacheDto.action) {
      case 'clear':
        if (cacheDto.userIds) {
          // Clear cache for specific users
          const results = await Promise.all(
            cacheDto.userIds.map(userId =>
              this.offlineDataService.invalidateCache(userId, cacheDto.dataType)
            )
          );
          return { cleared: results.length };
        }
        // Clear all cache (implement global clear method)
        return { message: 'Global cache clear not implemented yet' };

      case 'refresh':
        // Trigger cache refresh for users
        if (cacheDto.userIds) {
          const results = await Promise.all(
            cacheDto.userIds.map(userId =>
              this.offlineDataService.syncPendingData(userId)
            )
          );
          return { refreshed: results.length };
        }
        return { message: 'Global cache refresh not implemented yet' };

      case 'invalidate':
        if (cacheDto.tags) {
          // Invalidate by tags (implement tag-based invalidation)
          return { message: 'Tag-based invalidation not implemented yet' };
        }
        return { message: 'Invalid invalidation parameters' };

      default:
        return { message: 'Invalid cache action' };
    }
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  async getCacheStats() {
    // Implement cache statistics aggregation
    return this.offlineDataService.getCacheStatistics();
  }

  @Delete('cache/expired')
  @ApiOperation({ summary: 'Clean up expired cache data' })
  @ApiResponse({ status: 200, description: 'Expired cache cleaned up' })
  @HttpCode(HttpStatus.OK)
  async cleanExpiredCache() {
    return this.offlineDataService.cleanupExpiredData();
  }

  // Background Sync Management
  @Get('sync/jobs/all')
  @ApiOperation({ summary: 'Get all background sync jobs' })
  @ApiResponse({ status: 200, description: 'List of all sync jobs' })
  async getAllSyncJobs(
    @Query('status') status?: string,
    @Query('action') action?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.backgroundSyncService.getAllJobs({
      status: status as any,
      action,
      priority: priority as any,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Post('sync/process')
  @ApiOperation({ summary: 'Manually trigger sync job processing' })
  @ApiResponse({ status: 200, description: 'Sync processing triggered' })
  async triggerSyncProcessing() {
    return this.backgroundSyncService.processJobs();
  }

  @Delete('sync/cleanup')
  @ApiOperation({ summary: 'Clean up old sync jobs' })
  @ApiResponse({ status: 200, description: 'Old sync jobs cleaned up' })
  @HttpCode(HttpStatus.OK)
  async cleanupOldJobs(@Query('days') days?: string) {
    const dayCount = days ? parseInt(days) : 30;
    return this.backgroundSyncService.cleanupOldJobs(dayCount);
  }

  // Analytics and Reporting
  @Get('analytics/global')
  @ApiOperation({ summary: 'Get global PWA analytics' })
  @ApiResponse({ status: 200, description: 'Global PWA analytics' })
  async getGlobalAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: string,
    @Query('deviceType') deviceType?: string,
  ) {
    const filter: AnalyticsFilter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType: eventType as any,
      deviceType,
    };

    return this.analyticsService.getGlobalMetrics(filter);
  }

  @Get('analytics/installations')
  @ApiOperation({ summary: 'Get PWA installation analytics' })
  @ApiResponse({ status: 200, description: 'Installation analytics' })
  async getInstallationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filter: AnalyticsFilter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getInstallationMetrics(filter);
  }

  @Get('analytics/offline')
  @ApiOperation({ summary: 'Get offline usage analytics' })
  @ApiResponse({ status: 200, description: 'Offline usage analytics' })
  async getOfflineAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filter: AnalyticsFilter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getOfflineUsageMetrics(filter);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get PWA performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance analytics' })
  async getPerformanceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filter: AnalyticsFilter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getPerformanceMetrics(filter);
  }

  @Get('analytics/export')
  @ApiOperation({ summary: 'Export PWA analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported' })
  async exportAnalytics(
    @Query('format') format?: 'json' | 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: string,
  ) {
    const filter: AnalyticsFilter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType: eventType as any,
    };

    return this.analyticsService.exportAnalyticsData(filter, format || 'json');
  }

  // System Configuration
  @Get('config')
  @ApiOperation({ summary: 'Get PWA configuration' })
  @ApiResponse({ status: 200, description: 'PWA configuration' })
  async getPWAConfig() {
    return {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      pushNotificationsEnabled: !!process.env.VAPID_PRIVATE_KEY,
      backgroundSyncEnabled: true,
      offlineCacheEnabled: true,
      analyticsEnabled: true,
      maxCacheSize: process.env.PWA_MAX_CACHE_SIZE || '50MB',
      cacheRetentionDays: process.env.PWA_CACHE_RETENTION_DAYS || '30',
    };
  }
}
