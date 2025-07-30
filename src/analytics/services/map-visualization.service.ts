import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseLocation } from '../entities/purchase-location.entity';
import { GeolocationService } from './geolocation.service';

export interface MapVisualizationOptions {
  eventId?: string;
  region?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  minPurchases?: number;
  maxResults?: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    city: string;
    state?: string;
    country: string;
    region: string;
    totalPurchases: number;
    totalTickets: number;
    totalRevenue: number;
    averageTicketPrice: number;
    purchaseDates: string[];
    ticketTypes: Record<string, number>;
    trafficSources: Record<string, number>;
  };
}

export interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata: {
    totalLocations: number;
    totalPurchases: number;
    totalRevenue: number;
    regions: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

@Injectable()
export class MapVisualizationService {
  private readonly logger = new Logger(MapVisualizationService.name);

  constructor(
    @InjectRepository(PurchaseLocation)
    private readonly purchaseLocationRepository: Repository<PurchaseLocation>,
    private readonly geolocationService: GeolocationService,
  ) {}

  /**
   * Generate GeoJSON for map visualization
   */
  async generateGeoJSON(options: MapVisualizationOptions = {}): Promise<GeoJSONResponse> {
    const {
      eventId,
      region,
      country,
      startDate,
      endDate,
      minPurchases = 1,
      maxResults = 1000,
    } = options;

    // Build query
    const queryBuilder = this.purchaseLocationRepository
      .createQueryBuilder('location')
      .where('location.totalPurchases >= :minPurchases', { minPurchases });

    if (eventId) {
      queryBuilder.andWhere('location.eventId = :eventId', { eventId });
    }

    if (region) {
      queryBuilder.andWhere('location.region = :region', { region });
    }

    if (country) {
      queryBuilder.andWhere('location.country = :country', { country });
    }

    if (startDate) {
      queryBuilder.andWhere('location.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('location.createdAt <= :endDate', { endDate });
    }

    // Get locations with coordinates
    const locations = await queryBuilder
      .andWhere('location.latitude IS NOT NULL')
      .andWhere('location.longitude IS NOT NULL')
      .orderBy('location.totalPurchases', 'DESC')
      .limit(maxResults)
      .getMany();

    // Convert to GeoJSON features
    const features: GeoJSONFeature[] = locations.map(location => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      properties: {
        id: location.id,
        city: location.city,
        state: location.state,
        country: location.country,
        region: location.region,
        totalPurchases: location.totalPurchases,
        totalTickets: location.totalTickets,
        totalRevenue: Number(location.totalRevenue),
        averageTicketPrice: Number(location.averageTicketPrice),
        purchaseDates: location.purchaseDates || [],
        ticketTypes: location.ticketTypes || {},
        trafficSources: location.trafficSources || {},
      },
    }));

    // Calculate metadata
    const totalPurchases = locations.reduce((sum, loc) => sum + loc.totalPurchases, 0);
    const totalRevenue = locations.reduce((sum, loc) => sum + Number(loc.totalRevenue), 0);
    const regions = [...new Set(locations.map(loc => loc.region))];

    return {
      type: 'FeatureCollection',
      features,
      metadata: {
        totalLocations: features.length,
        totalPurchases,
        totalRevenue,
        regions,
        dateRange: startDate && endDate ? {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        } : undefined,
      },
    };
  }

  /**
   * Get aggregated statistics by region
   */
  async getRegionStatistics(options: MapVisualizationOptions = {}): Promise<{
    region: string;
    totalLocations: number;
    totalPurchases: number;
    totalRevenue: number;
    averageTicketPrice: number;
  }[]> {
    const { eventId, startDate, endDate } = options;

    const queryBuilder = this.purchaseLocationRepository
      .createQueryBuilder('location')
      .select('location.region', 'region')
      .addSelect('COUNT(DISTINCT location.id)', 'totalLocations')
      .addSelect('SUM(location.totalPurchases)', 'totalPurchases')
      .addSelect('SUM(location.totalRevenue)', 'totalRevenue')
      .addSelect('AVG(location.averageTicketPrice)', 'averageTicketPrice')
      .where('location.region IS NOT NULL');

    if (eventId) {
      queryBuilder.andWhere('location.eventId = :eventId', { eventId });
    }

    if (startDate) {
      queryBuilder.andWhere('location.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('location.createdAt <= :endDate', { endDate });
    }

    const results = await queryBuilder
      .groupBy('location.region')
      .orderBy('totalPurchases', 'DESC')
      .getRawMany();

    return results.map(result => ({
      region: result.region,
      totalLocations: Number(result.totalLocations),
      totalPurchases: Number(result.totalPurchases),
      totalRevenue: Number(result.totalRevenue),
      averageTicketPrice: Number(result.averageTicketPrice),
    }));
  }

  /**
   * Get top cities by purchase volume
   */
  async getTopCities(options: MapVisualizationOptions = {}): Promise<{
    city: string;
    country: string;
    region: string;
    totalPurchases: number;
    totalRevenue: number;
  }[]> {
    const { eventId, region, startDate, endDate, maxResults = 50 } = options;

    const queryBuilder = this.purchaseLocationRepository
      .createQueryBuilder('location')
      .select('location.city', 'city')
      .addSelect('location.country', 'country')
      .addSelect('location.region', 'region')
      .addSelect('SUM(location.totalPurchases)', 'totalPurchases')
      .addSelect('SUM(location.totalRevenue)', 'totalRevenue')
      .where('location.city IS NOT NULL');

    if (eventId) {
      queryBuilder.andWhere('location.eventId = :eventId', { eventId });
    }

    if (region) {
      queryBuilder.andWhere('location.region = :region', { region });
    }

    if (startDate) {
      queryBuilder.andWhere('location.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('location.createdAt <= :endDate', { endDate });
    }

    const results = await queryBuilder
      .groupBy('location.city, location.country, location.region')
      .orderBy('totalPurchases', 'DESC')
      .limit(maxResults)
      .getRawMany();

    return results.map(result => ({
      city: result.city,
      country: result.country,
      region: result.region,
      totalPurchases: Number(result.totalPurchases),
      totalRevenue: Number(result.totalRevenue),
    }));
  }

  /**
   * Get available regions for filtering
   */
  async getAvailableRegions(eventId?: string): Promise<string[]> {
    const queryBuilder = this.purchaseLocationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.region', 'region')
      .where('location.region IS NOT NULL');

    if (eventId) {
      queryBuilder.andWhere('location.eventId = :eventId', { eventId });
    }

    const results = await queryBuilder.getRawMany();
    return results.map(result => result.region);
  }

  /**
   * Get available countries for filtering
   */
  async getAvailableCountries(eventId?: string, region?: string): Promise<string[]> {
    const queryBuilder = this.purchaseLocationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.country', 'country')
      .where('location.country IS NOT NULL');

    if (eventId) {
      queryBuilder.andWhere('location.eventId = :eventId', { eventId });
    }

    if (region) {
      queryBuilder.andWhere('location.region = :region', { region });
    }

    const results = await queryBuilder.getRawMany();
    return results.map(result => result.country);
  }
} 