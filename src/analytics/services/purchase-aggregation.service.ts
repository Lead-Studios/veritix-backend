import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseLocation } from '../entities/purchase-location.entity';
import { GeolocationService } from './geolocation.service';

// Import existing purchase log entities
import { PurchaseLog } from '../../event-analytics/entities/purchase-log.entity';

@Injectable()
export class PurchaseAggregationService {
  private readonly logger = new Logger(PurchaseAggregationService.name);

  constructor(
    @InjectRepository(PurchaseLocation)
    private readonly purchaseLocationRepository: Repository<PurchaseLocation>,
    @InjectRepository(PurchaseLog)
    private readonly purchaseLogRepository: Repository<PurchaseLog>,
    private readonly geolocationService: GeolocationService,
  ) {}

  /**
   * Aggregate purchase data and populate purchase locations
   */
  async aggregatePurchaseData(eventId?: string): Promise<void> {
    try {
      this.logger.log('Starting purchase data aggregation...');

      // Get all purchase logs with location data
      const queryBuilder = this.purchaseLogRepository
        .createQueryBuilder('purchase')
        .where('purchase.country IS NOT NULL')
        .andWhere('purchase.city IS NOT NULL')
        .andWhere('purchase.status = :status', { status: 'completed' });

      if (eventId) {
        queryBuilder.andWhere('purchase.eventId = :eventId', { eventId });
      }

      const purchases = await queryBuilder.getMany();

      // Group purchases by location
      const locationGroups = this.groupPurchasesByLocation(purchases);

      // Process each location group
      for (const [locationKey, purchases] of locationGroups.entries()) {
        await this.processLocationGroup(locationKey, purchases);
      }

      this.logger.log(`Aggregation completed. Processed ${locationGroups.size} locations.`);
    } catch (error) {
      this.logger.error(`Error aggregating purchase data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group purchases by location (country, state, city)
   */
  private groupPurchasesByLocation(purchases: PurchaseLog[]): Map<string, PurchaseLog[]> {
    const groups = new Map<string, PurchaseLog[]>();

    for (const purchase of purchases) {
      const locationKey = this.createLocationKey(purchase);
      
      if (!groups.has(locationKey)) {
        groups.set(locationKey, []);
      }
      
      groups.get(locationKey)!.push(purchase);
    }

    return groups;
  }

  /**
   * Create a unique key for location grouping
   */
  private createLocationKey(purchase: PurchaseLog): string {
    const country = purchase.country?.toLowerCase().trim() || 'unknown';
    const state = purchase.state?.toLowerCase().trim() || '';
    const city = purchase.city?.toLowerCase().trim() || 'unknown';
    
    return `${country}:${state}:${city}`;
  }

  /**
   * Process a group of purchases for a specific location
   */
  private async processLocationGroup(locationKey: string, purchases: PurchaseLog[]): Promise<void> {
    if (purchases.length === 0) return;

    const firstPurchase = purchases[0];
    const { country, city } = firstPurchase;

    // Normalize location data
    const normalizedLocation = await this.geolocationService.normalizeLocation({
      country,
      city,
    });

    // Calculate aggregated metrics
    const metrics = this.calculateLocationMetrics(purchases);

    // Find or create purchase location record
    let purchaseLocation = await this.purchaseLocationRepository.findOne({
      where: {
        eventId: firstPurchase.eventId,
        country: normalizedLocation.country,
        city: normalizedLocation.city,
      },
    });

    if (!purchaseLocation) {
      purchaseLocation = this.purchaseLocationRepository.create({
        eventId: firstPurchase.eventId,
        country: normalizedLocation.country,
        city: normalizedLocation.city,
        state: normalizedLocation.state,
        region: normalizedLocation.region,
        latitude: normalizedLocation.latitude,
        longitude: normalizedLocation.longitude,
        totalPurchases: 0,
        totalTickets: 0,
        totalRevenue: 0,
        averageTicketPrice: 0,
        purchaseDates: [],
        ticketTypes: {},
        trafficSources: {},
      });
    }

    // Update metrics
    purchaseLocation.totalPurchases = metrics.totalPurchases;
    purchaseLocation.totalTickets = metrics.totalTickets;
    purchaseLocation.totalRevenue = metrics.totalRevenue;
    purchaseLocation.averageTicketPrice = metrics.averageTicketPrice;
    purchaseLocation.purchaseDates = metrics.purchaseDates;
    purchaseLocation.ticketTypes = metrics.ticketTypes;
    purchaseLocation.trafficSources = metrics.trafficSources;

    await this.purchaseLocationRepository.save(purchaseLocation);
  }

  /**
   * Calculate aggregated metrics for a group of purchases
   */
  private calculateLocationMetrics(purchases: PurchaseLog[]): {
    totalPurchases: number;
    totalTickets: number;
    totalRevenue: number;
    averageTicketPrice: number;
    purchaseDates: string[];
    ticketTypes: Record<string, number>;
    trafficSources: Record<string, number>;
  } {
    const totalPurchases = purchases.length;
    const totalTickets = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const averageTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    // Collect purchase dates
    const purchaseDates = purchases.map(p => p.createdAt.toISOString().split('T')[0]);

    // Aggregate ticket types (if available)
    const ticketTypes: Record<string, number> = {};
    purchases.forEach(p => {
      const type = 'general'; // PurchaseLog doesn't have ticketType field
      ticketTypes[type] = (ticketTypes[type] || 0) + p.quantity;
    });

    // Aggregate traffic sources
    const trafficSources: Record<string, number> = {};
    purchases.forEach(p => {
      const source = p.trafficSource || 'unknown';
      trafficSources[source] = (trafficSources[source] || 0) + 1;
    });

    return {
      totalPurchases,
      totalTickets,
      totalRevenue,
      averageTicketPrice,
      purchaseDates,
      ticketTypes,
      trafficSources,
    };
  }

  /**
   * Update coordinates for existing purchase locations
   */
  async updateCoordinates(): Promise<void> {
    try {
      this.logger.log('Updating coordinates for purchase locations...');

      const locations = await this.purchaseLocationRepository.find({
        where: {
          latitude: undefined,
          longitude: undefined,
        },
      });

      for (const location of locations) {
        const coordinates = await this.geolocationService.getCoordinates(
          location.city,
          location.state,
          location.country,
        );

        if (coordinates.latitude && coordinates.longitude) {
          location.latitude = coordinates.latitude;
          location.longitude = coordinates.longitude;
          await this.purchaseLocationRepository.save(location);
        }
      }

      this.logger.log(`Updated coordinates for ${locations.length} locations.`);
    } catch (error) {
      this.logger.error(`Error updating coordinates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get aggregation statistics
   */
  async getAggregationStats(): Promise<{
    totalLocations: number;
    totalPurchases: number;
    totalRevenue: number;
    regions: string[];
  }> {
    const [totalLocations, totalPurchases, totalRevenue, regions] = await Promise.all([
      this.purchaseLocationRepository.count(),
      this.purchaseLocationRepository
        .createQueryBuilder('location')
        .select('SUM(location.totalPurchases)', 'total')
        .getRawOne()
        .then(result => Number(result?.total || 0)),
      this.purchaseLocationRepository
        .createQueryBuilder('location')
        .select('SUM(location.totalRevenue)', 'total')
        .getRawOne()
        .then(result => Number(result?.total || 0)),
      this.purchaseLocationRepository
        .createQueryBuilder('location')
        .select('DISTINCT location.region', 'region')
        .where('location.region IS NOT NULL')
        .getRawMany()
        .then(results => results.map(r => r.region)),
    ]);

    return {
      totalLocations,
      totalPurchases,
      totalRevenue,
      regions,
    };
  }
} 