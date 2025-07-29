import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MapVisualizationService } from '../services/map-visualization.service';
import { GeolocationService } from '../services/geolocation.service';
import {
  MapVisualizationQueryDto,
  RegionStatisticsQueryDto,
  TopCitiesQueryDto,
  GeoJSONResponseDto,
  RegionStatisticsResponseDto,
  TopCitiesResponseDto,
  FilterOptionsResponseDto,
} from '../dto/map-visualization.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../admin/guards/roles.guard';
import { Roles } from '../../admin/decorators/roles.decorator';

@Controller('analytics/map')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapVisualizationController {
  constructor(
    private readonly mapVisualizationService: MapVisualizationService,
    private readonly geolocationService: GeolocationService,
  ) {}

  /**
   * Get GeoJSON data for map visualization
   */
  @Get('geojson')
  @Roles('admin', 'organizer')
  async getGeoJSON(@Query() query: MapVisualizationQueryDto): Promise<GeoJSONResponseDto> {
    try {
      const options = {
        eventId: query.eventId,
        region: query.region,
        country: query.country,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        minPurchases: query.minPurchases,
        maxResults: query.maxResults,
      };

      return await this.mapVisualizationService.generateGeoJSON(options);
    } catch (error) {
      throw new HttpException(
        `Failed to generate GeoJSON: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get region statistics
   */
  @Get('regions/statistics')
  @Roles('admin', 'organizer')
  async getRegionStatistics(@Query() query: RegionStatisticsQueryDto): Promise<RegionStatisticsResponseDto[]> {
    try {
      const options = {
        eventId: query.eventId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      return await this.mapVisualizationService.getRegionStatistics(options);
    } catch (error) {
      throw new HttpException(
        `Failed to get region statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get top cities by purchase volume
   */
  @Get('cities/top')
  @Roles('admin', 'organizer')
  async getTopCities(@Query() query: TopCitiesQueryDto): Promise<TopCitiesResponseDto[]> {
    try {
      const options = {
        eventId: query.eventId,
        region: query.region,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        maxResults: query.maxResults,
      };

      return await this.mapVisualizationService.getTopCities(options);
    } catch (error) {
      throw new HttpException(
        `Failed to get top cities: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get available regions for filtering
   */
  @Get('filters/regions')
  @Roles('admin', 'organizer')
  async getAvailableRegions(@Query('eventId') eventId?: string): Promise<string[]> {
    try {
      return await this.mapVisualizationService.getAvailableRegions(eventId);
    } catch (error) {
      throw new HttpException(
        `Failed to get available regions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get available countries for filtering
   */
  @Get('filters/countries')
  @Roles('admin', 'organizer')
  async getAvailableCountries(
    @Query('eventId') eventId?: string,
    @Query('region') region?: string,
  ): Promise<string[]> {
    try {
      return await this.mapVisualizationService.getAvailableCountries(eventId, region);
    } catch (error) {
      throw new HttpException(
        `Failed to get available countries: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all filter options
   */
  @Get('filters')
  @Roles('admin', 'organizer')
  async getFilterOptions(@Query('eventId') eventId?: string): Promise<FilterOptionsResponseDto> {
    try {
      const [regions, countries] = await Promise.all([
        this.mapVisualizationService.getAvailableRegions(eventId),
        this.mapVisualizationService.getAvailableCountries(eventId),
      ]);

      return {
        regions,
        countries,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get filter options: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all available regions from geolocation service
   */
  @Get('regions/all')
  @Roles('admin', 'organizer')
  async getAllRegions(): Promise<string[]> {
    try {
      return this.geolocationService.getAvailableRegions();
    } catch (error) {
      throw new HttpException(
        `Failed to get all regions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get countries by region
   */
  @Get('regions/:region/countries')
  @Roles('admin', 'organizer')
  async getCountriesByRegion(@Param('region') region: string): Promise<string[]> {
    try {
      return this.geolocationService.getCountriesByRegion(region);
    } catch (error) {
      throw new HttpException(
        `Failed to get countries for region: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 