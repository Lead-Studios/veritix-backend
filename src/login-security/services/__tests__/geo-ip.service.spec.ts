import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeoIpService } from '../geo-ip.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GeoIpService', () => {
  let service: GeoIpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoIpService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GeoIpService>(GeoIpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationByIp', () => {
    it('should return location data for valid IP', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'San Francisco',
          lat: 37.7749,
          lon: -122.4194,
          timezone: 'America/Los_Angeles',
          isp: 'Comcast',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getLocationByIp('8.8.8.8');

      expect(result).toEqual({
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
      });
    });

    it('should return default location for private IP', async () => {
      const result = await service.getLocationByIp('192.168.1.1');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
      });
    });

    it('should return default location for localhost', async () => {
      const result = await service.getLocationByIp('127.0.0.1');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getLocationByIp('8.8.8.8');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
      });
    });

    it('should handle API failure response', async () => {
      const mockResponse = {
        data: {
          status: 'fail',
          message: 'Invalid IP',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getLocationByIp('invalid-ip');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
      });
    });
  });

  describe('getLocationDistance', () => {
    it('should calculate distance between two locations', async () => {
      const location1 = {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
      };

      const location2 = {
        country: 'US',
        region: 'CA',
        city: 'Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
        isp: 'Verizon',
      };

      const distance = await service.getLocationDistance(location1, location2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000); // Should be less than 1000km
    });

    it('should return 0 for null locations', async () => {
      const distance = await service.getLocationDistance(null, null);
      expect(distance).toBe(0);
    });
  });

  describe('isNewLocation', () => {
    it('should return true for new location', () => {
      const currentLocation = {
        country: 'US',
        region: 'NY',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        isp: 'Verizon',
      };

      const previousLocations = [
        {
          country: 'US',
          region: 'CA',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
          timezone: 'America/Los_Angeles',
          isp: 'Comcast',
        },
      ];

      const result = service.isNewLocation(currentLocation, previousLocations);
      expect(result).toBe(true);
    });

    it('should return false for known location', () => {
      const currentLocation = {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
      };

      const previousLocations = [currentLocation];

      const result = service.isNewLocation(currentLocation, previousLocations);
      expect(result).toBe(false);
    });

    it('should return true for empty previous locations', () => {
      const currentLocation = {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
      };

      const result = service.isNewLocation(currentLocation, []);
      expect(result).toBe(true);
    });
  });
});
