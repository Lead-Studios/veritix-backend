import { Test, TestingModule } from '@nestjs/testing';
import { SessionTrackingService } from './session-tracking.service';
import { SessionManagementService } from './session-management.service';
import { GeoLocationService } from './geo-location.service';

describe('SessionTrackingService', () => {
  let service: SessionTrackingService;
  let sessionService: jest.Mocked<SessionManagementService>;
  let geoService: jest.Mocked<GeoLocationService>;

  const mockRequest = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-forwarded-for': '203.0.113.1',
    },
    connection: {
      remoteAddress: '192.168.1.1',
    },
  };

  beforeEach(async () => {
    const mockSessionService = {
      createSession: jest.fn(),
    };

    const mockGeoService = {
      getLocationFromIP: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionTrackingService,
        {
          provide: SessionManagementService,
          useValue: mockSessionService,
        },
        {
          provide: GeoLocationService,
          useValue: mockGeoService,
        },
      ],
    }).compile();

    service = module.get<SessionTrackingService>(SessionTrackingService);
    sessionService = module.get(SessionManagementService);
    geoService = module.get(GeoLocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSessionFromRequest', () => {
    it('should create session with extracted data', async () => {
      const userId = 'user-1';
      const loginMethod = 'password';
      
      geoService.getLocationFromIP.mockResolvedValue({
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
      });

      sessionService.createSession.mockResolvedValue({
        id: 'session-1',
      } as any);

      const result = await service.createSessionFromRequest(
        userId,
        mockRequest,
        loginMethod,
      );

      expect(geoService.getLocationFromIP).toHaveBeenCalledWith('203.0.113.1');
      expect(sessionService.createSession).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          jwtId: expect.any(String),
          ipAddress: '203.0.113.1',
          userAgent: mockRequest.headers['user-agent'],
          loginMethod,
          country: 'US',
          region: 'California',
          city: 'San Francisco',
          timezone: 'America/Los_Angeles',
          expiresAt: expect.any(Date),
          metadata: expect.objectContaining({
            loginTimestamp: expect.any(String),
            userAgent: mockRequest.headers['user-agent'],
          }),
        }),
      );

      expect(result).toEqual({
        jwtId: expect.any(String),
        sessionId: 'session-1',
      });
    });

    it('should extract IP from x-real-ip header', async () => {
      const requestWithRealIP = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-real-ip': '198.51.100.1',
        },
      };

      geoService.getLocationFromIP.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue({ id: 'session-1' } as any);

      await service.createSessionFromRequest('user-1', requestWithRealIP);

      expect(geoService.getLocationFromIP).toHaveBeenCalledWith('203.0.113.1');
    });

    it('should fallback to connection remote address', async () => {
      const requestWithoutHeaders = {
        connection: {
          remoteAddress: '192.168.1.1',
        },
        headers: {},
      };

      geoService.getLocationFromIP.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue({ id: 'session-1' } as any);

      await service.createSessionFromRequest('user-1', requestWithoutHeaders);

      expect(geoService.getLocationFromIP).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should calculate correct expiration date', async () => {
      geoService.getLocationFromIP.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue({ id: 'session-1' } as any);

      await service.createSessionFromRequest('user-1', mockRequest, 'password', '24h');

      const expectedExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      expect(sessionService.createSession).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );

      const actualCall = sessionService.createSession.mock.calls[0][1];
      const timeDiff = Math.abs(actualCall.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for with multiple IPs', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.168.1.1',
        },
      };

      const ip = service['extractIPAddress'](request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should handle missing headers gracefully', () => {
      const request = {
        headers: {},
        connection: {},
      };

      const ip = service['extractIPAddress'](request);
      expect(ip).toBe('127.0.0.1');
    });
  });

  describe('expiration calculation', () => {
    it('should calculate days correctly', () => {
      const result = service['calculateExpirationDate']('7d');
      const expected = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(result.getTime() - expected.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should calculate hours correctly', () => {
      const result = service['calculateExpirationDate']('12h');
      const expected = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const timeDiff = Math.abs(result.getTime() - expected.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should calculate minutes correctly', () => {
      const result = service['calculateExpirationDate']('30m');
      const expected = new Date(Date.now() + 30 * 60 * 1000);
      const timeDiff = Math.abs(result.getTime() - expected.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should default to 7 days for invalid format', () => {
      const result = service['calculateExpirationDate']('invalid');
      const expected = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(result.getTime() - expected.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });
});
