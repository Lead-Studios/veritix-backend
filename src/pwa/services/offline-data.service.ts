import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { OfflineData, OfflineDataType, SyncStatus } from '../entities/offline-data.entity';
import { PWACache, CacheType, CacheStrategy } from '../entities/pwa-cache.entity';
import { PWAAnalytics, PWAEventType } from '../entities/pwa-analytics.entity';

export interface CacheOptions {
  ttl?: number;
  strategy?: CacheStrategy;
  priority?: number;
  tags?: string[];
  dependencies?: string[];
}

export interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
  conflicts?: any[];
}

@Injectable()
export class OfflineDataService {
  private readonly logger = new Logger(OfflineDataService.name);

  constructor(
    @InjectRepository(OfflineData)
    private offlineDataRepository: Repository<OfflineData>,
    @InjectRepository(PWACache)
    private cacheRepository: Repository<PWACache>,
    @InjectRepository(PWAAnalytics)
    private analyticsRepository: Repository<PWAAnalytics>,
  ) {}

  async cacheData(
    userId: string,
    entityId: string,
    dataType: OfflineDataType,
    data: Record<string, any>,
    options: CacheOptions = {},
  ): Promise<OfflineData> {
    const existing = await this.offlineDataRepository.findOne({
      where: { userId, entityId, dataType },
    });

    const metadata = {
      version: (existing?.metadata?.version || 0) + 1,
      checksum: this.generateChecksum(data),
      cacheStrategy: options.strategy || 'conservative',
      priority: options.priority || 1,
      expiresAt: options.ttl ? new Date(Date.now() + options.ttl * 1000).toISOString() : null,
      tags: options.tags || [],
      dependencies: options.dependencies || [],
    };

    if (existing) {
      await this.offlineDataRepository.update(existing.id, {
        data,
        metadata,
        syncStatus: SyncStatus.SYNCED,
        lastSyncSuccess: new Date(),
        isStale: false,
      });
      return this.offlineDataRepository.findOne({ where: { id: existing.id } });
    }

    const offlineData = this.offlineDataRepository.create({
      userId,
      entityId,
      dataType,
      data,
      metadata,
      syncStatus: SyncStatus.SYNCED,
      lastSyncSuccess: new Date(),
    });

    const saved = await this.offlineDataRepository.save(offlineData);

    // Track cache analytics
    await this.trackAnalytics(userId, PWAEventType.CACHE_HIT, {
      dataType,
      entityId,
      dataSize: JSON.stringify(data).length,
    });

    return saved;
  }

  async getCachedData(
    userId: string,
    entityId: string,
    dataType: OfflineDataType,
  ): Promise<OfflineData | null> {
    const cached = await this.offlineDataRepository.findOne({
      where: { userId, entityId, dataType, isActive: true },
    });

    if (cached) {
      // Update access tracking
      await this.offlineDataRepository.update(cached.id, {
        accessCount: cached.accessCount + 1,
        lastAccessed: new Date(),
      });

      // Track cache hit
      await this.trackAnalytics(userId, PWAEventType.CACHE_HIT, {
        dataType,
        entityId,
        cacheAge: Date.now() - cached.createdAt.getTime(),
      });

      return cached;
    }

    // Track cache miss
    await this.trackAnalytics(userId, PWAEventType.CACHE_MISS, {
      dataType,
      entityId,
    });

    return null;
  }

  async getUserCachedData(
    userId: string,
    dataType?: OfflineDataType,
    limit = 100,
  ): Promise<OfflineData[]> {
    const query = this.offlineDataRepository
      .createQueryBuilder('data')
      .where('data.userId = :userId AND data.isActive = true', { userId })
      .orderBy('data.lastAccessed', 'DESC')
      .limit(limit);

    if (dataType) {
      query.andWhere('data.dataType = :dataType', { dataType });
    }

    return query.getMany();
  }

  async markDataForSync(
    userId: string,
    entityId: string,
    dataType: OfflineDataType,
    updatedData: Record<string, any>,
  ): Promise<OfflineData> {
    const existing = await this.offlineDataRepository.findOne({
      where: { userId, entityId, dataType },
    });

    if (existing) {
      await this.offlineDataRepository.update(existing.id, {
        data: updatedData,
        syncStatus: SyncStatus.PENDING,
        isStale: true,
        metadata: {
          ...existing.metadata,
          version: (existing.metadata?.version || 0) + 1,
          checksum: this.generateChecksum(updatedData),
        },
      });
      return this.offlineDataRepository.findOne({ where: { id: existing.id } });
    }

    const offlineData = this.offlineDataRepository.create({
      userId,
      entityId,
      dataType,
      data: updatedData,
      syncStatus: SyncStatus.PENDING,
      isStale: true,
      metadata: {
        version: 1,
        checksum: this.generateChecksum(updatedData),
      },
    });

    return this.offlineDataRepository.save(offlineData);
  }

  async syncPendingData(userId: string): Promise<SyncResult[]> {
    const pendingData = await this.offlineDataRepository.find({
      where: {
        userId,
        syncStatus: In([SyncStatus.PENDING, SyncStatus.FAILED]),
        isActive: true,
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    const results: SyncResult[] = [];

    for (const data of pendingData) {
      try {
        await this.offlineDataRepository.update(data.id, {
          syncStatus: SyncStatus.SYNCING,
          lastSyncAttempt: new Date(),
          syncAttempts: data.syncAttempts + 1,
        });

        // Simulate sync operation (in real implementation, this would call actual APIs)
        const syncResult = await this.performSync(data);

        await this.offlineDataRepository.update(data.id, {
          syncStatus: syncResult.success ? SyncStatus.SYNCED : SyncStatus.FAILED,
          lastSyncSuccess: syncResult.success ? new Date() : data.lastSyncSuccess,
          syncError: syncResult.error || null,
          conflictData: syncResult.conflicts || null,
          isStale: false,
        });

        results.push(syncResult);

        // Track sync analytics
        await this.trackAnalytics(userId, PWAEventType.BACKGROUND_SYNC, {
          dataType: data.dataType,
          entityId: data.entityId,
          success: syncResult.success,
          duration: Date.now() - data.lastSyncAttempt.getTime(),
        });

      } catch (error) {
        this.logger.error(`Sync failed for ${data.id}:`, error);

        await this.offlineDataRepository.update(data.id, {
          syncStatus: SyncStatus.FAILED,
          syncError: error.message,
        });

        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async invalidateCache(
    userId: string,
    entityId?: string,
    dataType?: OfflineDataType,
  ): Promise<void> {
    const query = this.offlineDataRepository
      .createQueryBuilder()
      .update(OfflineData)
      .set({ isStale: true, syncStatus: SyncStatus.PENDING })
      .where('userId = :userId', { userId });

    if (entityId) {
      query.andWhere('entityId = :entityId', { entityId });
    }

    if (dataType) {
      query.andWhere('dataType = :dataType', { dataType });
    }

    await query.execute();
  }

  async cleanupExpiredData(): Promise<{ deletedCount: number }> {
    const now = new Date();
    
    // Delete expired data
    const result = await this.offlineDataRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();

    return { deletedCount: result.affected || 0 };
  }

  async getCacheStatistics(): Promise<Record<string, any>> {
    const [totalItems, expiredItems, pendingSync] = await Promise.all([
      this.offlineDataRepository.count(),
      this.offlineDataRepository.count({
        where: { expiresAt: Between(new Date('1900-01-01'), new Date()) },
      }),
      this.offlineDataRepository.count({
        where: { needsSync: true },
      }),
    ]);

    return {
      totalItems,
      expiredItems,
      pendingSync,
      cacheHitRate: 0.85, // Placeholder
    };
  }

  private generateChecksum(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
  }

  private async trackAnalytics(
    userId: string,
    eventType: any,
    eventData?: Record<string, any>,
  ): Promise<void> {
    // Analytics tracking placeholder
    this.logger.debug(`Analytics: ${userId} - ${eventType}`, eventData);
  }
        byType[item.dataType] = { count: 0, size: 0 };
      }
      byType[item.dataType].count++;
      byType[item.dataType].size += size;
    });

    return {
      totalSize,
      itemCount: userData.length,
      byType: byType as Record<OfflineDataType, { count: number; size: number }>,
    };
  }

  private async performSync(data: OfflineData): Promise<SyncResult> {
    // This is a placeholder for actual sync logic
    // In real implementation, this would call appropriate APIs based on dataType
    
    try {
      switch (data.dataType) {
        case OfflineDataType.TICKET:
          return this.syncTicketData(data);
        case OfflineDataType.EVENT:
          return this.syncEventData(data);
        case OfflineDataType.USER_PROFILE:
          return this.syncUserProfileData(data);
        default:
          return { success: true, data: data.data };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async syncTicketData(data: OfflineData): Promise<SyncResult> {
    // Placeholder for ticket sync logic
    return { success: true, data: data.data };
  }

  private async syncEventData(data: OfflineData): Promise<SyncResult> {
    // Placeholder for event sync logic
    return { success: true, data: data.data };
  }

  private async syncUserProfileData(data: OfflineData): Promise<SyncResult> {
    // Placeholder for user profile sync logic
    return { success: true, data: data.data };
  }

  private generateChecksum(data: Record<string, any>): string {
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async trackAnalytics(
    userId: string,
    eventType: PWAEventType,
    eventData?: Record<string, any>,
  ): Promise<void> {
    try {
      const analytics = this.analyticsRepository.create({
        userId,
        sessionId: `session-${Date.now()}`,
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
