import { Test, TestingModule } from '@nestjs/testing';
import { ThrottleService } from '../../src/services/throttle.service';
import { SubscriptionPlan } from '../../src/types/subscription.types';

describe('ThrottleService', () => {
  let service: ThrottleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThrottleService],
    }).compile();

    service = module.get<ThrottleService>(ThrottleService);
  });

  afterEach(() => {
    // Clear storage between tests
    (service as any).storage.clear();
  });

  describe('checkThrottle', () => {
    it('should return correct limits for FREE plan', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );

      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(100);
      expect(result.reset).toBeGreaterThan(Date.now());
      expect(result.retryAfter).toBeUndefined();
    });

    it('should return correct limits for BASIC plan', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.BASIC,
        'hour',
      );

      expect(result.limit).toBe(500);
      expect(result.remaining).toBe(500);
    });

    it('should return correct limits for PREMIUM plan', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.PREMIUM,
        'minute',
      );

      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(100);
    });

    it('should return correct limits for ENTERPRISE plan', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.ENTERPRISE,
        'day',
      );

      expect(result.limit).toBe(100000);
      expect(result.remaining).toBe(100000);
    });

    it('should track separate limits for different organizers', async () => {
      const result1 = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      const result2 = await service.checkThrottle(
        'org_2',
        SubscriptionPlan.FREE,
        'day',
      );

      expect(result1.remaining).toBe(100);
      expect(result2.remaining).toBe(100);
    });

    it('should track separate limits for different windows', async () => {
      const dayResult = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      const hourResult = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'hour',
      );
      const minuteResult = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'minute',
      );

      expect(dayResult.limit).toBe(100);
      expect(hourResult.limit).toBe(50);
      expect(minuteResult.limit).toBe(5);
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter correctly', async () => {
      // First check
      let result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(100);

      // Increment counter
      await service.incrementCounter('org_1', 'day');

      // Check again
      result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(99);
    });

    it('should handle multiple increments', async () => {
      // Increment 5 times
      for (let i = 0; i < 5; i++) {
        await service.incrementCounter('org_1', 'day');
      }

      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(95);
    });

    it('should set retryAfter when limit exceeded', async () => {
      // Increment to exceed FREE limit (100 requests per day)
      for (let i = 0; i < 101; i++) {
        await service.incrementCounter('org_1', 'day');
      }

      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', async () => {
      const remaining = await service.getRemainingRequests(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(remaining).toBe(100);
    });

    it('should return updated remaining after increment', async () => {
      await service.incrementCounter('org_1', 'day');
      const remaining = await service.getRemainingRequests(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );
      expect(remaining).toBe(99);
    });
  });

  describe('cleanup', () => {
    it('should not remove active records', () => {
      // Create a record that's not expired
      const storage = (service as any).storage;
      const futureTime = Date.now() + 60000; // 1 minute in future
      storage.set('test:org:day', { count: 1, resetTime: futureTime });

      service.cleanup();

      expect(storage.has('test:org:day')).toBe(true);
    });

    it('should remove expired records', () => {
      // Create a record that's expired
      const storage = (service as any).storage;
      const pastTime = Date.now() - 60000; // 1 minute in past
      storage.set('test:org:day', { count: 1, resetTime: pastTime });

      service.cleanup();

      expect(storage.has('test:org:day')).toBe(false);
    });
  });

  describe('window calculations', () => {
    it('should handle day window correctly', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'day',
      );

      const now = new Date();
      const expectedReset = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).getTime();

      // Allow for some time difference due to test execution
      expect(Math.abs(result.reset - expectedReset)).toBeLessThan(1000);
    });

    it('should handle hour window correctly', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'hour',
      );

      const now = new Date();
      const expectedReset = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() + 1,
      ).getTime();

      expect(Math.abs(result.reset - expectedReset)).toBeLessThan(1000);
    });

    it('should handle minute window correctly', async () => {
      const result = await service.checkThrottle(
        'org_1',
        SubscriptionPlan.FREE,
        'minute',
      );

      const now = new Date();
      const expectedReset = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes() + 1,
      ).getTime();

      expect(Math.abs(result.reset - expectedReset)).toBeLessThan(1000);
    });
  });
});
