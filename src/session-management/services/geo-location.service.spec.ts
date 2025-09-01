import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeoLocationService } from './geo-location.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GeoLocationService', () => {
  let service: GeoLocationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoLocationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GeoLocationService>(GeoLocationService);
    configService = module.get(ConfigService);

    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLocationFromIP', () => {
    it('should return location data for valid public IP', async () => {
      const mockResponse = {
        status: 'success',
        country: 'United States',
        regionName: 'California',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getLocationFromIP('203.0.113.1');

      expect(fetch).toHaveBeenCalledWith(
        'http://ip-api.com/json/203.0.113.1?fields=status,country,regionName,city,timezone',
      );
      expect(result).toEqual({
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
      });
    });

    it('should return unknown data for private IP addresses', async () => {
      const result = await service.getLocationFromIP('192.168.1.1');

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      });
    });

    it('should return unknown data for localhost', async () => {
      const result = await service.getLocationFromIP('localhost');

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      });
    });

    it('should return unknown data when API call fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.getLocationFromIP('203.0.113.1');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      });
    });

    it('should return unknown data when API returns error status', async () => {
      const mockResponse = {
        status: 'fail',
        message: 'private range',
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getLocationFromIP('203.0.113.1');

      expect(result).toEqual({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      });
    });
  });

  describe('isPrivateIP', () => {
    it('should detect localhost', () => {
      expect(service['isPrivateIP']('localhost')).toBe(true);
      expect(service['isPrivateIP']('127.0.0.1')).toBe(true);
    });

    it('should detect private IPv4 ranges', () => {
      expect(service['isPrivateIP']('10.0.0.1')).toBe(true);
      expect(service['isPrivateIP']('172.16.0.1')).toBe(true);
      expect(service['isPrivateIP']('172.31.255.255')).toBe(true);
      expect(service['isPrivateIP']('192.168.1.1')).toBe(true);
    });

    it('should detect IPv6 private addresses', () => {
      expect(service['isPrivateIP']('::1')).toBe(true);
      expect(service['isPrivateIP']('fc00::1')).toBe(true);
      expect(service['isPrivateIP']('fe80::1')).toBe(true);
    });

    it('should not detect public IPs as private', () => {
      expect(service['isPrivateIP']('8.8.8.8')).toBe(false);
      expect(service['isPrivateIP']('203.0.113.1')).toBe(false);
      expect(service['isPrivateIP']('198.51.100.1')).toBe(false);
    });

    it('should not detect edge cases as private', () => {
      expect(service['isPrivateIP']('172.15.255.255')).toBe(false);
      expect(service['isPrivateIP']('172.32.0.1')).toBe(false);
    });
  });
});
