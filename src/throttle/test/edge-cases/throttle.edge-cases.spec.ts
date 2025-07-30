import { Test, TestingModule } from '@nestjs/testing';
import { ThrottleService } from '../../src/services/throttle.service';
import { OrganizerThrottleGuard } from '../../src/guards/organizer-throttle.guard';
import { OrganizerService } from '../../src/services/organizer.service';
import { SubscriptionPlan } from '../../src/types/subscription.types';
import { Reflector } from '@nestjs/core';
import { MockRequest, MockResponse } from '../utils/test-helpers';

describe('Throttle Edge Cases', () => {
  let throttleService: ThrottleService;
  let guard: OrganizerThrottleGuard;
  let organizerService: OrganizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrottleService,
        OrganizerThrottleGuard,
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

    throttleService = module.get<ThrottleService>(ThrottleService);
    guard = module.get<OrganizerThrottleGuard>(OrganizerThrottleGuard);
    organizerService = module.get<OrganizerService>(OrganizerService);
  });

  afterEach(() => {
    (throttleService as any).storage.clear();
    jest.clearAllMocks();
  });

  describe('Time boundary edge cases', () => {
    it('should reset counters at day boundary', async () => {
      const organizerId = 'boundary_test_org';

      // Mock current time to be near day boundary
      const mockDate = new Date('2023-12-31T23:59:59.999Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Make a request
      await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'day',
      );
      await throttleService.incrementCounter(organizerId, 'day');

      let result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(99);

      // Move time to next day
      const nextDay = new Date('2024-01-01T00:00:00.001Z');
      jest.spyOn(global, 'Date').mockImplementation(() => nextDay as any);

      // Counter should reset
      result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(100);

      jest.restoreAllMocks();
    });

    it('should handle hour boundary correctly', async () => {
      const organizerId = 'hour_boundary_test';

      // Mock current time to be near hour boundary
      const mockDate = new Date('2023-12-31T14:59:59.999Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await throttleService.incrementCounter(organizerId, 'hour');
      let result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'hour',
      );
      expect(result.remaining).toBe(49);

      // Move to next hour
      const nextHour = new Date('2023-12-31T15:00:00.001Z');
      jest.spyOn(global, 'Date').mockImplementation(() => nextHour as any);

      result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'hour',
      );
      expect(result.remaining).toBe(50);

      jest.restoreAllMocks();
    });

    it('should handle minute boundary correctly', async () => {
      const organizerId = 'minute_boundary_test';

      const mockDate = new Date('2023-12-31T14:30:59.999Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await throttleService.incrementCounter(organizerId, 'minute');
      let result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'minute',
      );
      expect(result.remaining).toBe(4);

      const nextMinute = new Date('2023-12-31T14:31:00.001Z');
      jest.spyOn(global, 'Date').mockImplementation(() => nextMinute as any);

      result = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'minute',
      );
      expect(result.remaining).toBe(5);

      jest.restoreAllMocks();
    });
  });

  describe('Memory management edge cases', () => {
    it('should handle memory pressure gracefully', () => {
      const storage = (throttleService as any).storage;

      // Fill storage with many records
      for (let i = 0; i < 10000; i++) {
        storage.set(`stress_test_${i}`, {
          count: Math.floor(Math.random() * 100),
          resetTime: Date.now() + Math.random() * 86400000, // Random time within 24 hours
        });
      }

      expect(storage.size).toBe(10000);

      // Service should still function normally
      expect(async () => {
        await throttleService.checkThrottle(
          'new_org',
          SubscriptionPlan.FREE,
          'day',
        );
      }).not.toThrow();
    });

    it('should handle corrupted storage data', () => {
      const storage = (throttleService as any).storage;

      // Add corrupted data
      storage.set('corrupted_1', null);
      storage.set('corrupted_2', undefined);
      storage.set('corrupted_3', { count: 'invalid' });
      storage.set('corrupted_4', { resetTime: 'invalid' });

      // Service should handle gracefully
      expect(async () => {
        await throttleService.checkThrottle(
          'test_org',
          SubscriptionPlan.FREE,
          'day',
        );
        await throttleService.incrementCounter('test_org', 'day');
        throttleService.cleanup();
      }).not.toThrow();
    });
  });

  describe('Organizer ID extraction edge cases', () => {
    it('should handle malformed organizer IDs', async () => {
      const mockRequest = new MockRequest();
      const mockResponse = new MockResponse();

      const reflector = jest.mocked(guard['reflector']);
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest.setOrganizerInHeader(''),
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Organizer ID not found',
      );
    });

    it('should handle special characters in organizer ID', async () => {
      const specialOrgId = 'org-123_test@domain.com';

      jest
        .spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(SubscriptionPlan.FREE);

      const result = await throttleService.checkThrottle(
        specialOrgId,
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.limit).toBe(100);

      await throttleService.incrementCounter(specialOrgId, 'day');

      const updatedResult = await throttleService.checkThrottle(
        specialOrgId,
        SubscriptionPlan.FREE,
        'day',
      );
      expect(updatedResult.remaining).toBe(99);
    });

    it('should handle very long organizer IDs', async () => {
      const longOrgId = 'a'.repeat(1000);

      const result = await throttleService.checkThrottle(
        longOrgId,
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.limit).toBe(100);
    });
  });

  describe('Concurrent access edge cases', () => {
    it('should handle race conditions gracefully', async () => {
      const organizerId = 'race_condition_test';

      // Simulate race condition with rapid concurrent requests
      const promises = Array.from({ length: 50 }, () =>
        throttleService
          .checkThrottle(organizerId, SubscriptionPlan.FREE, 'day')
          .then(() => throttleService.incrementCounter(organizerId, 'day')),
      );

      await Promise.all(promises);

      const finalResult = await throttleService.checkThrottle(
        organizerId,
        SubscriptionPlan.FREE,
        'day',
      );

      // Should have processed all increments correctly
      expect(finalResult.remaining).toBe(50); // 100 - 50 = 50
    });

    it('should handle simultaneous cleanup and access', async () => {
      const organizerId = 'cleanup_test';

      // Start some operations
      const operationPromises = Array.from({ length: 10 }, async (_, i) => {
        await throttleService.checkThrottle(
          `${organizerId}_${i}`,
          SubscriptionPlan.FREE,
          'day',
        );
        await throttleService.incrementCounter(`${organizerId}_${i}`, 'day');
      });

      // Run cleanup simultaneously
      const cleanupPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          throttleService.cleanup();
          resolve();
        }, 5);
      });

      // Both should complete without errors
      await Promise.all([...operationPromises, cleanupPromise]);

      // Verify system is still functional
      const result = await throttleService.checkThrottle(
        'new_test_org',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.limit).toBe(100);
    });
  });

  describe('Subscription plan edge cases', () => {
    it('should handle unknown subscription plans gracefully', async () => {
      const unknownPlan = 'UNKNOWN_PLAN' as SubscriptionPlan;

      expect(async () => {
        await throttleService.checkThrottle('test_org', unknownPlan, 'day');
      }).not.toThrow();
    });

    it('should handle null/undefined subscription plans', async () => {
      jest
        .spyOn(organizerService, 'getOrganizerSubscriptionPlan')
        .mockResolvedValue(null as any);

      const mockRequest = new MockRequest().setOrganizerInHeader('test_org');
      const mockResponse = new MockResponse();

      const reflector = jest.mocked(guard['reflector']);
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // THROTTLE_SKIP_KEY
        .mockReturnValueOnce({}); // THROTTLE_ORGANIZER_KEY

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      // Should default to FREE plan
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });
});
