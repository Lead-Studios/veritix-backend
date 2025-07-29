import { IsOptional, IsString, IsUUID, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class MapVisualizationQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  minPurchases?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value))
  maxResults?: number;
}

export class RegionStatisticsQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class TopCitiesQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value))
  maxResults?: number;
}

export class GeoJSONResponseDto {
  type: 'FeatureCollection';
  features: Array<{
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
  }>;
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

export class RegionStatisticsResponseDto {
  region: string;
  totalLocations: number;
  totalPurchases: number;
  totalRevenue: number;
  averageTicketPrice: number;
}

export class TopCitiesResponseDto {
  city: string;
  country: string;
  region: string;
  totalPurchases: number;
  totalRevenue: number;
}

export class FilterOptionsResponseDto {
  regions: string[];
  countries: string[];
} 