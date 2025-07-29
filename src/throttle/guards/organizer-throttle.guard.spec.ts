import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { OrganizerThrottleGuard } from '../../src/guards/organizer-throttle.guard';
import { ThrottleService } from '../../src/services/throttle.service';
import { OrganizerService } from '../../src/services/organizer.service';
import { SubscriptionPlan } from '../../src/types/subscription.types';
import { THROTTLE_ORGANIZER_KEY, THROTTLE_SKIP_KEY } from '../../src/decorators/throttle.decorator';

describe('OrganizerThrottleGuard', () => {
  let guard: OrganizerThrottleGuard;
  let throttleService: ThrottleService;
  let organizerService: OrganizerService;
  let reflector: Reflector;

  const mockRequest = {
    headers: {},
    query: {},
    params: {},
    user: {},
  } as any;

  const mockResponse = {
    set: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizerThrottleGuard,
        {
          provide: ThrottleService,
          useValue: {
            checkThrottle: jest.fn(),
            incrementCounter: jest.fn(),
          },
        },
        {
          provide: OrganizerService,
          useValue: {
            getOrganizerSubscriptionPlan: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizerThrottleGuard>(OrganizerThrottleGuard);
    throttleService = module.get<ThrottleService>(ThrottleService);
    organizerService = module.get<OrganizerService>(OrganizerService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock objects
    mockRequest.headers = {};
    mockRequest.query = {};
    mockRequest.params = {};
    mockRequest.user = {};
  });

  describe('canActivate', () => {
    it('should return true when throttling is skipped', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true); // THROTTLE_SKIP_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(throttleService.checkThrottle).not.toHaveBeenCalled();
    });

    it('should return true when throttle options are not set', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce(null); // THROTTLE_ORGANIZER_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(throttleService.checkThrottle).not.toHaveBeenCalled();
    });

    it('should throw exception when organizer ID is not found', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(HttpException);
    });

    it('should extract organizer ID from JWT token', async () => {
      mockRequest.user = { organizerId: 'org_1' };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 100,
          remaining: 50,
          reset: Date.now() + 60000,
        });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(organizerService.getOrganizerSubscriptionPlan)
        .toHaveBeenCalledWith('org_1');
    });

    it('should extract organizer ID from headers', async () => {
      mockRequest.headers['x-organizer-id'] = 'org_2';

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.BASIC);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 1000,
          remaining: 500,
          reset: Date.now() + 60000,
        });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(organizerService.getOrganizerSubscriptionPlan)
        .toHaveBeenCalledWith('org_2');
    });

    it('should extract organizer ID from query parameters', async () => {
      mockRequest.query.organizerId = 'org_3';

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.PREMIUM);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 10000,
          remaining: 9000,
          reset: Date.now() + 60000,
        });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(organizerService.getOrganizerSubscriptionPlan)
        .toHaveBeenCalledWith('org_3');
    });

    it('should extract organizer ID from route parameters', async () => {
      mockRequest.params.organizerId = 'org_4';

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.ENTERPRISE);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 100000,
          remaining: 90000,
          reset: Date.now() + 60000,
        });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(organizerService.getOrganizerSubscriptionPlan)
        .toHaveBeenCalledWith('org_4');
    });

    it('should throw TOO_MANY_REQUESTS when rate limit exceeded', async () => {
      mockRequest.user = { organizerId: 'org_1' };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 100,
          remaining: 0,
          reset: Date.now() + 60000,
          retryAfter: 3600,
        });

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(HttpException);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should set correct rate limit headers', async () => {
      mockRequest.user = { organizerId: 'org_1' };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({ customLimitKey: 'hour' }); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      const resetTime = Date.now() + 60000;
      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 50,
          remaining: 25,
          reset: resetTime,
        });

      await guard.canActivate(mockExecutionContext);

      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '25',
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        'X-RateLimit-Window': 'hour',
      });
    });

    it('should increment counter after successful check', async () => {
      mockRequest.user = { organizerId: 'org_1' };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 100,
          remaining: 50,
          reset: Date.now() + 60000,
        });

      await guard.canActivate(mockExecutionContext);

      expect(throttleService.incrementCounter)
        .toHaveBeenCalledWith('org_1', 'day');
    });

    it('should use custom limit key when specified', async () => {
      mockRequest.user = { organizerId: 'org_1' };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({ customLimitKey: 'minute' }); // THROTTLE_ORGANIZER_KEY

      jest.spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      jest.spyOn(throttleService, 'checkThrottle')
        .mockResolvedValue({
          limit: 5,
          remaining: 3,
          reset: Date.now() + 60000,
        });

      await guard.canActivate(mockExecutionContext);

      expect(throttleService.checkThrottle)
        .toHaveBeenCalledWith('org_1', SubscriptionPlan.FREE, 'minute');
      expect(throttleService.incrementCounter)
        .toHaveBeenCalledWith('org_1', 'minute');
    });
  });
});
