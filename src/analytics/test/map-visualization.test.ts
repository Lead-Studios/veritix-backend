import { Test, TestingModule } from '@nestjs/testing';
import { MapVisualizationService } from '../services/map-visualization.service';
import { GeolocationService } from '../services/geolocation.service';
import { PurchaseAggregationService } from '../services/purchase-aggregation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PurchaseLocation } from '../entities/purchase-location.entity';
import { PurchaseLog } from '../../event-analytics/entities/purchase-log.entity';

describe('Map Visualization API', () => {
  let mapVisualizationService: MapVisualizationService;
  let geolocationService: GeolocationService;
  let purchaseAggregationService: PurchaseAggregationService;

  const mockPurchaseLocationRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      count: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    })),
    find: jest.fn(),
  };

  const mockPurchaseLogRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapVisualizationService,
        GeolocationService,
        PurchaseAggregationService,
        {
          provide: getRepositoryToken(PurchaseLocation),
          useValue: mockPurchaseLocationRepository,
        },
        {
          provide: getRepositoryToken(PurchaseLog),
          useValue: mockPurchaseLogRepository,
        },
      ],
    }).compile();

    mapVisualizationService = module.get<MapVisualizationService>(MapVisualizationService);
    geolocationService = module.get<GeolocationService>(GeolocationService);
    purchaseAggregationService = module.get<PurchaseAggregationService>(PurchaseAggregationService);
  });

  describe('GeoJSON Generation', () => {
    it('should generate GeoJSON with location data', async () => {
      const mockLocations = [
        {
          id: '1',
          eventId: 'event-1',
          country: 'United States',
          city: 'New York',
          state: 'NY',
          region: 'North America',
          latitude: 40.7128,
          longitude: -74.0060,
          totalPurchases: 150,
          totalTickets: 300,
          totalRevenue: 15000.00,
          averageTicketPrice: 50.00,
          purchaseDates: ['2024-01-15', '2024-01-16'],
          ticketTypes: { general: 200, vip: 100 },
          trafficSources: { organic: 80, social: 70 },
        },
      ];

      const queryBuilder = mockPurchaseLocationRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockLocations);

      const result = await mapVisualizationService.generateGeoJSON({
        eventId: 'event-1',
        minPurchases: 1,
        maxResults: 1000,
      });

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].geometry.coordinates).toEqual([-74.0060, 40.7128]);
      expect(result.features[0].properties.city).toBe('New York');
      expect(result.metadata.totalLocations).toBe(1);
    });

    it('should filter by region', async () => {
      const mockLocations = [
        {
          id: '1',
          eventId: 'event-1',
          country: 'United States',
          city: 'New York',
          region: 'North America',
          latitude: 40.7128,
          longitude: -74.0060,
          totalPurchases: 150,
          totalTickets: 300,
          totalRevenue: 15000.00,
          averageTicketPrice: 50.00,
          purchaseDates: [],
          ticketTypes: {},
          trafficSources: {},
        },
      ];

      const queryBuilder = mockPurchaseLocationRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockLocations);

      const result = await mapVisualizationService.generateGeoJSON({
        region: 'North America',
      });

      expect(result.features).toHaveLength(1);
      expect(result.features[0].properties.region).toBe('North America');
    });
  });

  describe('Region Statistics', () => {
    it('should return region statistics', async () => {
      const mockStats = [
        {
          region: 'North America',
          totalLocations: 15,
          totalPurchases: 800,
          totalRevenue: 40000.00,
          averageTicketPrice: 50.00,
        },
      ];

      const queryBuilder = mockPurchaseLocationRepository.createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockStats);

      const result = await mapVisualizationService.getRegionStatistics({
        eventId: 'event-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].region).toBe('North America');
      expect(result[0].totalPurchases).toBe(800);
    });
  });

  describe('Top Cities', () => {
    it('should return top cities by purchase volume', async () => {
      const mockCities = [
        {
          city: 'New York',
          country: 'United States',
          region: 'North America',
          totalPurchases: 150,
          totalRevenue: 7500.00,
        },
      ];

      const queryBuilder = mockPurchaseLocationRepository.createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockCities);

      const result = await mapVisualizationService.getTopCities({
        eventId: 'event-1',
        maxResults: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('New York');
      expect(result[0].totalPurchases).toBe(150);
    });
  });

  describe('Geolocation Service', () => {
    it('should normalize location data', async () => {
      const result = await geolocationService.normalizeLocation({
        country: 'United States',
        city: 'New York',
      });

      expect(result.country).toBe('United States');
      expect(result.city).toBe('New York');
      expect(result.region).toBe('North America');
    });

    it('should get available regions', () => {
      const regions = geolocationService.getAvailableRegions();
      expect(regions).toContain('North America');
      expect(regions).toContain('Europe');
      expect(regions).toContain('Asia');
    });

    it('should get countries by region', () => {
      const countries = geolocationService.getCountriesByRegion('North America');
      expect(countries).toContain('US');
      expect(countries).toContain('CA');
      expect(countries).toContain('MX');
    });
  });

  describe('Purchase Aggregation', () => {
    it('should aggregate purchase data', async () => {
      const mockPurchases = [
        {
          id: '1',
          eventId: 'event-1',
          purchaserId: 'user-1',
          purchaserName: 'John Doe',
          purchaserEmail: 'john@example.com',
          quantity: 2,
          unitPrice: 50.00,
          totalAmount: 100.00,
          status: 'completed',
          country: 'United States',
          city: 'New York',
          createdAt: new Date(),
        },
      ];

      const queryBuilder = mockPurchaseLogRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockPurchases);

      await purchaseAggregationService.aggregatePurchaseData('event-1');

      expect(mockPurchaseLogRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should get aggregation statistics', async () => {
      const mockStats = {
        totalLocations: 25,
        totalPurchases: 1500,
        totalRevenue: 75000.00,
        regions: ['North America', 'Europe', 'Asia'],
      };

      const queryBuilder = mockPurchaseLocationRepository.createQueryBuilder();
      queryBuilder.count.mockResolvedValue(25);
      queryBuilder.getRawOne
        .mockResolvedValueOnce({ total: 1500 })
        .mockResolvedValueOnce({ total: 75000.00 });
      queryBuilder.getRawMany.mockResolvedValue([
        { region: 'North America' },
        { region: 'Europe' },
        { region: 'Asia' },
      ]);

      const result = await purchaseAggregationService.getAggregationStats();

      expect(result.totalLocations).toBe(25);
      expect(result.totalPurchases).toBe(1500);
      expect(result.totalRevenue).toBe(75000.00);
      expect(result.regions).toHaveLength(3);
    });
  });
}); 