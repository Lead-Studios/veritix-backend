import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { OfflineData, OfflineDataType, SyncStatus } from '../entities/offline-data.entity';
import { PWACache, CacheType } from '../entities/pwa-cache.entity';
import { PWAAnalytics, PWAEventType } from '../entities/pwa-analytics.entity';
import { Event } from '../../events/entities/event.entity';

export interface EventDiscoveryOptions {
  location?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  radius?: number;
  limit?: number;
  sortBy?: 'date' | 'popularity' | 'price' | 'distance';
}

export interface CachedEventData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  pricing: {
    minPrice: number;
    maxPrice: number;
    currency: string;
  };
  category: string;
  organizer: {
    name: string;
    verified: boolean;
  };
  popularity: {
    attendeeCount: number;
    rating: number;
    reviewCount: number;
  };
  availability: {
    totalTickets: number;
    availableTickets: number;
    soldOut: boolean;
  };
  tags: string[];
  lastUpdated: Date;
}

@Injectable()
export class OfflineEventDiscoveryService {
  private readonly logger = new Logger(OfflineEventDiscoveryService.name);

  constructor(
    @InjectRepository(OfflineData)
    private offlineDataRepository: Repository<OfflineData>,
    @InjectRepository(PWACache)
    private cacheRepository: Repository<PWACache>,
    @InjectRepository(PWAAnalytics)
    private analyticsRepository: Repository<PWAAnalytics>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async cacheEventsForOfflineDiscovery(
    userId: string,
    location?: string,
    radius = 50,
  ): Promise<void> {
    try {
      this.logger.log(`Caching events for offline discovery - User: ${userId}`);

      // Get popular events in the area
      const events = await this.getPopularEvents(location, radius, 100);
      
      // Cache each event individually
      for (const event of events) {
        const cachedData = this.transformEventForCache(event);
        
        await this.offlineDataRepository.save({
          userId,
          entityId: event.id,
          dataType: OfflineDataType.EVENT,
          data: cachedData,
          metadata: {
            version: 1,
            checksum: this.generateChecksum(cachedData),
            cacheStrategy: 'aggressive',
            priority: this.calculateEventPriority(event),
            expiresAt: this.calculateExpirationDate(event.startDate).toISOString(),
            tags: ['discovery', 'popular', location || 'global'],
          },
          syncStatus: SyncStatus.SYNCED,
          lastSyncSuccess: new Date(),
          expiresAt: this.calculateExpirationDate(event.startDate),
        });
      }

      // Cache search metadata
      await this.cacheSearchMetadata(userId, location, events.length);

      await this.trackAnalytics(userId, PWAEventType.OFFLINE_USAGE, {
        action: 'events_cached',
        eventCount: events.length,
        location,
        radius,
      });

      this.logger.log(`Cached ${events.length} events for offline discovery`);

    } catch (error) {
      this.logger.error('Failed to cache events for offline discovery:', error);
      throw error;
    }
  }

  async discoverEventsOffline(
    userId: string,
    options: EventDiscoveryOptions = {},
  ): Promise<CachedEventData[]> {
    try {
      this.logger.log(`Discovering events offline - User: ${userId}`);

      const query = this.offlineDataRepository
        .createQueryBuilder('data')
        .where('data.userId = :userId', { userId })
        .andWhere('data.dataType = :dataType', { dataType: OfflineDataType.EVENT })
        .andWhere('data.isActive = true')
        .andWhere('(data.expiresAt IS NULL OR data.expiresAt > :now)', { now: new Date() });

      // Apply filters
      if (options.category) {
        query.andWhere("data.data->>'category' = :category", { category: options.category });
      }

      if (options.dateRange) {
        query.andWhere("(data.data->>'startDate')::timestamp >= :startDate", { 
          startDate: options.dateRange.start 
        });
        query.andWhere("(data.data->>'startDate')::timestamp <= :endDate", { 
          endDate: options.dateRange.end 
        });
      }

      if (options.priceRange) {
        query.andWhere("(data.data->'pricing'->>'minPrice')::numeric >= :minPrice", { 
          minPrice: options.priceRange.min 
        });
        query.andWhere("(data.data->'pricing'->>'maxPrice')::numeric <= :maxPrice", { 
          maxPrice: options.priceRange.max 
        });
      }

      // Apply sorting
      switch (options.sortBy) {
        case 'date':
          query.orderBy("(data.data->>'startDate')::timestamp", 'ASC');
          break;
        case 'popularity':
          query.orderBy("(data.data->'popularity'->>'attendeeCount')::numeric", 'DESC');
          break;
        case 'price':
          query.orderBy("(data.data->'pricing'->>'minPrice')::numeric", 'ASC');
          break;
        default:
          query.orderBy('data.createdAt', 'DESC');
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      const cachedEvents = await query.getMany();
      const events = cachedEvents.map(cached => cached.data as CachedEventData);

      // Update access tracking
      await this.updateAccessTracking(userId, cachedEvents.map(e => e.id));

      await this.trackAnalytics(userId, PWAEventType.OFFLINE_USAGE, {
        action: 'events_discovered',
        eventCount: events.length,
        filters: options,
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to discover events offline:', error);
      throw error;
    }
  }

  async getCachedEventDetails(
    userId: string,
    eventId: string,
  ): Promise<CachedEventData | null> {
    try {
      const cached = await this.offlineDataRepository.findOne({
        where: {
          userId,
          entityId: eventId,
          dataType: OfflineDataType.EVENT,
          isActive: true,
        },
      });

      if (!cached || cached.isExpired) {
        return null;
      }

      // Update access tracking
      await this.offlineDataRepository.update(cached.id, {
        accessCount: cached.accessCount + 1,
        lastAccessed: new Date(),
      });

      await this.trackAnalytics(userId, PWAEventType.OFFLINE_USAGE, {
        action: 'event_details_viewed',
        eventId,
      });

      return cached.data as CachedEventData;

    } catch (error) {
      this.logger.error('Failed to get cached event details:', error);
      return null;
    }
  }

  async searchCachedEvents(
    userId: string,
    searchTerm: string,
    limit = 20,
  ): Promise<CachedEventData[]> {
    try {
      const query = this.offlineDataRepository
        .createQueryBuilder('data')
        .where('data.userId = :userId', { userId })
        .andWhere('data.dataType = :dataType', { dataType: OfflineDataType.EVENT })
        .andWhere('data.isActive = true')
        .andWhere('(data.expiresAt IS NULL OR data.expiresAt > :now)', { now: new Date() })
        .andWhere(`(
          LOWER(data.data->>'title') LIKE LOWER(:searchTerm) OR
          LOWER(data.data->>'description') LIKE LOWER(:searchTerm) OR
          LOWER(data.data->'venue'->>'name') LIKE LOWER(:searchTerm) OR
          LOWER(data.data->>'category') LIKE LOWER(:searchTerm)
        )`, { searchTerm: `%${searchTerm}%` })
        .orderBy('data.accessCount', 'DESC')
        .limit(limit);

      const results = await query.getMany();
      const events = results.map(cached => cached.data as CachedEventData);

      await this.trackAnalytics(userId, PWAEventType.OFFLINE_USAGE, {
        action: 'events_searched',
        searchTerm,
        resultCount: events.length,
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to search cached events:', error);
      return [];
    }
  }

  async getOfflineDiscoveryStats(userId: string): Promise<Record<string, any>> {
    try {
      const stats = await this.offlineDataRepository
        .createQueryBuilder('data')
        .select([
          'COUNT(*) as totalEvents',
          'COUNT(CASE WHEN data.expiresAt > :now THEN 1 END) as activeEvents',
          'COUNT(CASE WHEN data.lastAccessed > :recentThreshold THEN 1 END) as recentlyAccessed',
          'SUM(data.accessCount) as totalAccesses',
          'AVG(data.accessCount) as avgAccesses',
        ])
        .where('data.userId = :userId', { userId })
        .andWhere('data.dataType = :dataType', { dataType: OfflineDataType.EVENT })
        .andWhere('data.isActive = true')
        .setParameters({
          now: new Date(),
          recentThreshold: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        })
        .getRawOne();

      const categories = await this.offlineDataRepository
        .createQueryBuilder('data')
        .select("data.data->>'category' as category, COUNT(*) as count")
        .where('data.userId = :userId', { userId })
        .andWhere('data.dataType = :dataType', { dataType: OfflineDataType.EVENT })
        .andWhere('data.isActive = true')
        .groupBy("data.data->>'category'")
        .getRawMany();

      return {
        ...stats,
        categories: categories.reduce((acc, cat) => {
          acc[cat.category] = parseInt(cat.count);
          return acc;
        }, {}),
      };

    } catch (error) {
      this.logger.error('Failed to get offline discovery stats:', error);
      return {};
    }
  }

  private async getPopularEvents(
    location?: string,
    radius = 50,
    limit = 100,
  ): Promise<Event[]> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .leftJoinAndSelect('event.category', 'category')
      .where('event.isActive = true')
      .andWhere('event.startDate > :now', { now: new Date() })
      .orderBy('event.attendeeCount', 'DESC')
      .addOrderBy('event.rating', 'DESC')
      .limit(limit);

    // Add location filtering if provided
    if (location) {
      query.andWhere('venue.city ILIKE :location OR venue.address ILIKE :location', {
        location: `%${location}%`,
      });
    }

    return query.getMany();
  }

  private transformEventForCache(event: Event): CachedEventData {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      startDate: event.startDate,
      endDate: event.endDate,
      venue: {
        name: event.venue?.name || 'TBD',
        address: event.venue?.address || '',
        city: event.venue?.city || '',
        coordinates: event.venue?.coordinates ? {
          lat: event.venue.coordinates.lat,
          lng: event.venue.coordinates.lng,
        } : undefined,
      },
      pricing: {
        minPrice: event.minPrice || 0,
        maxPrice: event.maxPrice || 0,
        currency: event.currency || 'USD',
      },
      category: event.category?.name || 'General',
      organizer: {
        name: event.organizer?.name || 'Unknown',
        verified: event.organizer?.isVerified || false,
      },
      popularity: {
        attendeeCount: event.attendeeCount || 0,
        rating: event.rating || 0,
        reviewCount: event.reviewCount || 0,
      },
      availability: {
        totalTickets: event.totalTickets || 0,
        availableTickets: event.availableTickets || 0,
        soldOut: event.soldOut || false,
      },
      tags: event.tags || [],
      lastUpdated: new Date(),
    };
  }

  private calculateEventPriority(event: Event): number {
    let priority = 1;
    
    // Higher priority for soon-to-start events
    const daysUntilEvent = Math.ceil(
      (event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilEvent <= 7) priority += 3;
    else if (daysUntilEvent <= 30) priority += 2;
    else if (daysUntilEvent <= 90) priority += 1;

    // Higher priority for popular events
    if (event.attendeeCount > 1000) priority += 2;
    else if (event.attendeeCount > 100) priority += 1;

    // Higher priority for highly rated events
    if (event.rating >= 4.5) priority += 2;
    else if (event.rating >= 4.0) priority += 1;

    return Math.min(priority, 10); // Cap at 10
  }

  private calculateExpirationDate(eventDate: Date): Date {
    // Events expire 1 day after they end
    const expiration = new Date(eventDate);
    expiration.setDate(expiration.getDate() + 1);
    return expiration;
  }

  private async cacheSearchMetadata(
    userId: string,
    location: string,
    eventCount: number,
  ): Promise<void> {
    const metadata = {
      location,
      eventCount,
      lastCached: new Date(),
      cacheVersion: 1,
    };

    await this.offlineDataRepository.save({
      userId,
      entityId: `search-metadata-${location || 'global'}`,
      dataType: OfflineDataType.SEARCH_RESULTS,
      data: metadata,
      metadata: {
        version: 1,
        checksum: this.generateChecksum(metadata),
        cacheStrategy: 'conservative',
        priority: 5,
        tags: ['metadata', 'search'],
      },
      syncStatus: SyncStatus.SYNCED,
      lastSyncSuccess: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
  }

  private async updateAccessTracking(
    userId: string,
    eventIds: string[],
  ): Promise<void> {
    if (eventIds.length === 0) return;

    await this.offlineDataRepository
      .createQueryBuilder()
      .update(OfflineData)
      .set({
        accessCount: () => 'access_count + 1',
        lastAccessed: new Date(),
      })
      .where('userId = :userId', { userId })
      .andWhere('entityId IN (:...eventIds)', { eventIds })
      .andWhere('dataType = :dataType', { dataType: OfflineDataType.EVENT })
      .execute();
  }

  private generateChecksum(data: any): string {
    // Simple checksum generation for data integrity
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async trackAnalytics(
    userId: string,
    eventType: PWAEventType,
    eventData?: Record<string, any>,
  ): Promise<void> {
    try {
      const analytics = this.analyticsRepository.create({
        userId,
        sessionId: `offline-discovery-${Date.now()}`,
        eventType,
        eventData,
        isOnline: false,
      });

      await this.analyticsRepository.save(analytics);
    } catch (error) {
      this.logger.error('Failed to track analytics:', error);
    }
  }

  async refreshEventCache(userId: string, eventId: string): Promise<boolean> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['venue', 'organizer', 'category'],
      });

      if (!event) {
        return false;
      }

      const cachedData = this.transformEventForCache(event);
      
      await this.offlineDataRepository.update(
        { userId, entityId: eventId, dataType: OfflineDataType.EVENT },
        {
          data: cachedData,
          metadata: {
            version: 1,
            checksum: this.generateChecksum(cachedData),
            cacheStrategy: 'aggressive',
            priority: this.calculateEventPriority(event),
            expiresAt: this.calculateExpirationDate(event.startDate).toISOString(),
            tags: ['discovery', 'refreshed'],
          },
          syncStatus: SyncStatus.SYNCED,
          lastSyncSuccess: new Date(),
          expiresAt: this.calculateExpirationDate(event.startDate),
        }
      );

      return true;

    } catch (error) {
      this.logger.error('Failed to refresh event cache:', error);
      return false;
    }
  }

  async cleanupExpiredEventCache(): Promise<void> {
    try {
      const now = new Date();
      
      const expiredEvents = await this.offlineDataRepository.find({
        where: {
          dataType: OfflineDataType.EVENT,
          expiresAt: LessThan(now),
          isActive: true,
        },
      });

      if (expiredEvents.length > 0) {
        await this.offlineDataRepository.update(
          { id: In(expiredEvents.map(e => e.id)) },
          { isActive: false }
        );

        this.logger.log(`Cleaned up ${expiredEvents.length} expired event cache entries`);
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired event cache:', error);
    }
  }
}
