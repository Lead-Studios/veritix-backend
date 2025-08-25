import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WalletPass, PassStatus } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

export interface LocationTrigger {
  passId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  triggeredAt: Date;
  deviceId?: string;
  userId: string;
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // meters
  relevantText?: string;
  notificationTitle?: string;
  notificationBody?: string;
  triggerOnEntry?: boolean;
  triggerOnExit?: boolean;
  cooldownPeriod?: number; // minutes
}

export interface BeaconTrigger {
  passId: string;
  proximityUUID: string;
  major?: number;
  minor?: number;
  proximity: 'immediate' | 'near' | 'far';
  rssi: number;
  triggeredAt: Date;
  deviceId?: string;
  userId: string;
}

export interface NotificationPreferences {
  enableLocationNotifications: boolean;
  enableBeaconNotifications: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  maxNotificationsPerDay?: number;
  notificationChannels: ('push' | 'sms' | 'email')[];
}

@Injectable()
export class GeolocationNotificationService {
  private readonly logger = new Logger(GeolocationNotificationService.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    @InjectQueue('location-notifications')
    private notificationQueue: Queue,
  ) {}

  /**
   * Process location trigger from device
   */
  async processLocationTrigger(trigger: LocationTrigger): Promise<{
    success: boolean;
    notificationSent: boolean;
    relevantPasses: number;
    error?: string;
  }> {
    this.logger.log(`Processing location trigger for user ${trigger.userId} at ${trigger.latitude}, ${trigger.longitude}`);

    try {
      // Find passes with location-based notifications for this user
      const passes = await this.passRepository.find({
        where: {
          userId: trigger.userId,
          status: PassStatus.ACTIVE,
        },
        relations: ['user', 'event'],
      });

      const relevantPasses = passes.filter(pass => 
        this.isLocationRelevant(pass, trigger.latitude, trigger.longitude)
      );

      if (relevantPasses.length === 0) {
        return {
          success: true,
          notificationSent: false,
          relevantPasses: 0,
        };
      }

      let notificationsSent = 0;

      // Process each relevant pass
      for (const pass of relevantPasses) {
        const shouldNotify = await this.shouldSendLocationNotification(pass, trigger);
        
        if (shouldNotify) {
          await this.sendLocationNotification(pass, trigger);
          notificationsSent++;

          // Track analytics
          await this.trackLocationAnalytics(pass.id, trigger);
        }
      }

      return {
        success: true,
        notificationSent: notificationsSent > 0,
        relevantPasses: relevantPasses.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process location trigger: ${error.message}`);
      return {
        success: false,
        notificationSent: false,
        relevantPasses: 0,
        error: error.message,
      };
    }
  }

  /**
   * Process beacon trigger from device
   */
  async processBeaconTrigger(trigger: BeaconTrigger): Promise<{
    success: boolean;
    notificationSent: boolean;
    relevantPasses: number;
    error?: string;
  }> {
    this.logger.log(`Processing beacon trigger for user ${trigger.userId} - UUID: ${trigger.proximityUUID}`);

    try {
      // Find passes with beacon-based notifications for this user
      const passes = await this.passRepository.find({
        where: {
          userId: trigger.userId,
          status: PassStatus.ACTIVE,
        },
        relations: ['user', 'event'],
      });

      const relevantPasses = passes.filter(pass => 
        this.isBeaconRelevant(pass, trigger)
      );

      if (relevantPasses.length === 0) {
        return {
          success: true,
          notificationSent: false,
          relevantPasses: 0,
        };
      }

      let notificationsSent = 0;

      // Process each relevant pass
      for (const pass of relevantPasses) {
        const shouldNotify = await this.shouldSendBeaconNotification(pass, trigger);
        
        if (shouldNotify) {
          await this.sendBeaconNotification(pass, trigger);
          notificationsSent++;

          // Track analytics
          await this.trackBeaconAnalytics(pass.id, trigger);
        }
      }

      return {
        success: true,
        notificationSent: notificationsSent > 0,
        relevantPasses: relevantPasses.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process beacon trigger: ${error.message}`);
      return {
        success: false,
        notificationSent: false,
        relevantPasses: 0,
        error: error.message,
      };
    }
  }

  /**
   * Configure geofences for a pass
   */
  async configureGeofences(passId: string, geofences: GeofenceConfig[]): Promise<{
    success: boolean;
    configuredGeofences: number;
    error?: string;
  }> {
    this.logger.log(`Configuring ${geofences.length} geofences for pass ${passId}`);

    try {
      const pass = await this.passRepository.findOne({ where: { id: passId } });
      if (!pass) {
        throw new Error('Pass not found');
      }

      // Convert geofences to pass locations format
      const locations = geofences.map(geofence => ({
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        altitude: 0,
        relevantText: geofence.relevantText || 'You are near your event venue',
      }));

      // Update pass with new locations
      await this.passRepository.update(passId, {
        locations,
        metadata: {
          ...pass.metadata,
          geofences: geofences.map(g => ({
            ...g,
            id: this.generateGeofenceId(),
          })),
        },
      });

      return {
        success: true,
        configuredGeofences: geofences.length,
      };
    } catch (error) {
      this.logger.error(`Failed to configure geofences: ${error.message}`);
      return {
        success: false,
        configuredGeofences: 0,
        error: error.message,
      };
    }
  }

  /**
   * Configure beacons for a pass
   */
  async configureBeacons(passId: string, beacons: any[]): Promise<{
    success: boolean;
    configuredBeacons: number;
    error?: string;
  }> {
    this.logger.log(`Configuring ${beacons.length} beacons for pass ${passId}`);

    try {
      const pass = await this.passRepository.findOne({ where: { id: passId } });
      if (!pass) {
        throw new Error('Pass not found');
      }

      // Update pass with new beacons
      await this.passRepository.update(passId, {
        beacons,
        metadata: {
          ...pass.metadata,
          beaconConfig: {
            beacons,
            lastUpdated: new Date(),
          },
        },
      });

      return {
        success: true,
        configuredBeacons: beacons.length,
      };
    } catch (error) {
      this.logger.error(`Failed to configure beacons: ${error.message}`);
      return {
        success: false,
        configuredBeacons: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get location analytics for a pass
   */
  async getLocationAnalytics(passId: string, days: number = 30): Promise<{
    totalLocationTriggers: number;
    totalBeaconTriggers: number;
    uniqueLocations: number;
    triggersByDay: Array<{ date: string; locationTriggers: number; beaconTriggers: number }>;
    topLocations: Array<{ latitude: number; longitude: number; triggers: number }>;
    proximityDistribution: Array<{ proximity: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const locationAnalytics = await this.analyticsRepository.find({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.LOCATION_TRIGGERED,
        timestamp: { $gte: startDate } as any,
      },
      order: { timestamp: 'DESC' },
    });

    const beaconAnalytics = await this.analyticsRepository.find({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.BEACON_TRIGGERED,
        timestamp: { $gte: startDate } as any,
      },
      order: { timestamp: 'DESC' },
    });

    // Process location data
    const uniqueLocationSet = new Set();
    const locationCounts = new Map();

    locationAnalytics.forEach(analytics => {
      if (analytics.eventData?.triggeredLocation) {
        const location = analytics.eventData.triggeredLocation;
        const locationKey = `${location.latitude},${location.longitude}`;
        uniqueLocationSet.add(locationKey);
        locationCounts.set(locationKey, (locationCounts.get(locationKey) || 0) + 1);
      }
    });

    // Process beacon proximity data
    const proximityDistribution = beaconAnalytics.reduce((acc, analytics) => {
      const proximity = analytics.eventData?.triggeredBeacon?.proximity || 'unknown';
      acc[proximity] = (acc[proximity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by day
    const triggersByDay = this.groupTriggersByDay(locationAnalytics, beaconAnalytics, days);

    // Top locations
    const topLocations = Array.from(locationCounts.entries())
      .map(([locationKey, triggers]) => {
        const [lat, lng] = locationKey.split(',').map(Number);
        return { latitude: lat, longitude: lng, triggers };
      })
      .sort((a, b) => b.triggers - a.triggers)
      .slice(0, 10);

    return {
      totalLocationTriggers: locationAnalytics.length,
      totalBeaconTriggers: beaconAnalytics.length,
      uniqueLocations: uniqueLocationSet.size,
      triggersByDay,
      topLocations,
      proximityDistribution: Object.entries(proximityDistribution).map(([proximity, count]) => ({
        proximity,
        count,
      })),
    };
  }

  /**
   * Bulk configure location notifications for multiple passes
   */
  async bulkConfigureLocationNotifications(
    passIds: string[],
    config: {
      geofences?: GeofenceConfig[];
      beacons?: any[];
      preferences?: NotificationPreferences;
    }
  ): Promise<{
    success: boolean;
    configuredPasses: number;
    failedPasses: number;
    results: Array<{
      passId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    this.logger.log(`Bulk configuring location notifications for ${passIds.length} passes`);

    const results = [];
    let configuredPasses = 0;
    let failedPasses = 0;

    for (const passId of passIds) {
      try {
        // Configure geofences if provided
        if (config.geofences) {
          await this.configureGeofences(passId, config.geofences);
        }

        // Configure beacons if provided
        if (config.beacons) {
          await this.configureBeacons(passId, config.beacons);
        }

        // Update notification preferences if provided
        if (config.preferences) {
          await this.updateNotificationPreferences(passId, config.preferences);
        }

        results.push({
          passId,
          success: true,
        });
        configuredPasses++;
      } catch (error) {
        results.push({
          passId,
          success: false,
          error: error.message,
        });
        failedPasses++;
      }
    }

    return {
      success: failedPasses === 0,
      configuredPasses,
      failedPasses,
      results,
    };
  }

  // Private helper methods

  private isLocationRelevant(pass: WalletPass, latitude: number, longitude: number): boolean {
    if (!pass.locations || pass.locations.length === 0) {
      return false;
    }

    return pass.locations.some(location => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      );
      return distance <= 1000; // 1km radius
    });
  }

  private isBeaconRelevant(pass: WalletPass, trigger: BeaconTrigger): boolean {
    if (!pass.beacons || pass.beacons.length === 0) {
      return false;
    }

    return pass.beacons.some(beacon => {
      if (beacon.proximityUUID !== trigger.proximityUUID) {
        return false;
      }
      if (beacon.major && beacon.major !== trigger.major) {
        return false;
      }
      if (beacon.minor && beacon.minor !== trigger.minor) {
        return false;
      }
      return true;
    });
  }

  private async shouldSendLocationNotification(pass: WalletPass, trigger: LocationTrigger): Promise<boolean> {
    // Check if we're in quiet hours
    if (this.isInQuietHours(pass)) {
      return false;
    }

    // Check cooldown period
    const lastNotification = await this.getLastLocationNotification(pass.id, trigger.latitude, trigger.longitude);
    if (lastNotification) {
      const cooldownMinutes = 30; // Default cooldown
      const timeSinceLastNotification = Date.now() - lastNotification.getTime();
      if (timeSinceLastNotification < cooldownMinutes * 60 * 1000) {
        return false;
      }
    }

    // Check daily notification limit
    const todayNotificationCount = await this.getTodayNotificationCount(pass.id);
    const maxNotificationsPerDay = 5; // Default limit
    if (todayNotificationCount >= maxNotificationsPerDay) {
      return false;
    }

    return true;
  }

  private async shouldSendBeaconNotification(pass: WalletPass, trigger: BeaconTrigger): Promise<boolean> {
    // Similar logic to location notifications
    return this.shouldSendLocationNotification(pass, {
      passId: trigger.passId,
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      triggeredAt: trigger.triggeredAt,
      deviceId: trigger.deviceId,
      userId: trigger.userId,
    });
  }

  private async sendLocationNotification(pass: WalletPass, trigger: LocationTrigger): Promise<void> {
    const relevantLocation = pass.locations?.find(location => {
      const distance = this.calculateDistance(
        trigger.latitude,
        trigger.longitude,
        location.latitude,
        location.longitude
      );
      return distance <= 1000;
    });

    const notificationData = {
      passId: pass.id,
      userId: pass.userId,
      title: 'Event Nearby',
      body: relevantLocation?.relevantText || `You're near ${pass.event.name}`,
      data: {
        passId: pass.id,
        eventId: pass.eventId,
        triggerType: 'location',
        location: {
          latitude: trigger.latitude,
          longitude: trigger.longitude,
        },
      },
    };

    await this.notificationQueue.add('send-location-notification', notificationData);
  }

  private async sendBeaconNotification(pass: WalletPass, trigger: BeaconTrigger): Promise<void> {
    const relevantBeacon = pass.beacons?.find(beacon => 
      beacon.proximityUUID === trigger.proximityUUID &&
      (!beacon.major || beacon.major === trigger.major) &&
      (!beacon.minor || beacon.minor === trigger.minor)
    );

    const notificationData = {
      passId: pass.id,
      userId: pass.userId,
      title: 'Welcome to the Venue',
      body: relevantBeacon?.relevantText || `Welcome to ${pass.event.name}`,
      data: {
        passId: pass.id,
        eventId: pass.eventId,
        triggerType: 'beacon',
        beacon: {
          proximityUUID: trigger.proximityUUID,
          major: trigger.major,
          minor: trigger.minor,
          proximity: trigger.proximity,
        },
      },
    };

    await this.notificationQueue.add('send-beacon-notification', notificationData);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private isInQuietHours(pass: WalletPass): boolean {
    // Implementation would check user's quiet hours preferences
    return false;
  }

  private async getLastLocationNotification(passId: string, latitude: number, longitude: number): Promise<Date | null> {
    const lastNotification = await this.analyticsRepository.findOne({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.LOCATION_TRIGGERED,
      },
      order: { timestamp: 'DESC' },
    });

    return lastNotification?.timestamp || null;
  }

  private async getTodayNotificationCount(passId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.analyticsRepository.count({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.NOTIFICATION_SENT,
        timestamp: { $gte: today } as any,
      },
    });
  }

  private generateGeofenceId(): string {
    return `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateNotificationPreferences(passId: string, preferences: NotificationPreferences): Promise<void> {
    await this.passRepository.update(passId, {
      metadata: {
        notificationPreferences: preferences,
      },
    });
  }

  private async trackLocationAnalytics(passId: string, trigger: LocationTrigger): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.LOCATION_TRIGGERED,
        timestamp: new Date(),
        deviceId: trigger.deviceId,
        location: {
          latitude: trigger.latitude,
          longitude: trigger.longitude,
          accuracy: trigger.accuracy,
        },
        eventData: {
          triggeredLocation: {
            latitude: trigger.latitude,
            longitude: trigger.longitude,
          },
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track location analytics: ${error.message}`);
    }
  }

  private async trackBeaconAnalytics(passId: string, trigger: BeaconTrigger): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.BEACON_TRIGGERED,
        timestamp: new Date(),
        deviceId: trigger.deviceId,
        eventData: {
          triggeredBeacon: {
            proximityUUID: trigger.proximityUUID,
            major: trigger.major,
            minor: trigger.minor,
            proximity: trigger.proximity,
          },
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track beacon analytics: ${error.message}`);
    }
  }

  private groupTriggersByDay(
    locationAnalytics: PassAnalytics[],
    beaconAnalytics: PassAnalytics[],
    days: number
  ): Array<{ date: string; locationTriggers: number; beaconTriggers: number }> {
    const dayMap = new Map<string, { locationTriggers: number; beaconTriggers: number }>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap.set(dateStr, { locationTriggers: 0, beaconTriggers: 0 });
    }

    // Count location triggers by day
    locationAnalytics.forEach(analytics => {
      const dateStr = analytics.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.get(dateStr)!.locationTriggers++;
      }
    });

    // Count beacon triggers by day
    beaconAnalytics.forEach(analytics => {
      const dateStr = analytics.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.get(dateStr)!.beaconTriggers++;
      }
    });

    // Convert to array and sort by date
    return Array.from(dayMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
