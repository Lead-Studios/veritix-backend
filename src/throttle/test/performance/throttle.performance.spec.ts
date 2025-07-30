import { Test, TestingModule } from '@nestjs/testing';
import { ThrottleService } from '../../src/services/throttle.service';
import { SubscriptionPlan } from '../../src/types/subscription.types';

describe('ThrottleService Performance', () => {
  let service: ThrottleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThrottleService],
    }).compile();

    service = module.get<ThrottleService>(ThrottleService);
  });

  afterEach(() => {
    (service as any).storage.clear();
  });

  it('should handle high concurrent load', async () => {
    const organizerId = 'load_test_org';
    const concurrentRequests = 100;
    const startTime = Date.now();

    // Create 100 concurrent requests
    const promises = Array.from(
      { length: concurrentRequests },
      async (_, index) => {
        await service.checkThrottle(
          organizerId,
          SubscriptionPlan.ENTERPRISE,
          'day',
        );
        await service.incrementCounter(organizerId, 'day');
        return index;
      },
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(concurrentRequests);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second

    // Verify final count
    const finalCheck = await service.checkThrottle(
      organizerId,
      SubscriptionPlan.ENTERPRISE,
      'day',
    );
    expect(finalCheck.remaining).toBe(100000 - concurrentRequests);
  });

  it('should handle multiple organizers efficiently', async () => {
    const organizerCount = 50;
    const requestsPerOrganizer = 10;
    const startTime = Date.now();

    const promises = [];
    for (let orgIndex = 0; orgIndex < organizerCount; orgIndex++) {
      const organizerId = `perf_org_${orgIndex}`;

      for (let reqIndex = 0; reqIndex < requestsPerOrganizer; reqIndex++) {
        promises.push(
          service
            .checkThrottle(organizerId, SubscriptionPlan.BASIC, 'hour')
            .then(() => service.incrementCounter(organizerId, 'hour')),
        );
      }
    }

    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

    // Verify storage size
    const storage = (service as any).storage;
    expect(storage.size).toBe(organizerCount);
  });

  it('should cleanup efficiently', () => {
    const storage = (service as any).storage;

    // Add 1000 expired records
    for (let i = 0; i < 1000; i++) {
      storage.set(`expired_${i}`, {
        count: 1,
        resetTime: Date.now() - 60000, // 1 minute ago
      });
    }

    // Add 100 active records
    for (let i = 0; i < 100; i++) {
      storage.set(`active_${i}`, {
        count: 1,
        resetTime: Date.now() + 60000, // 1 minute from now
      });
    }

    expect(storage.size).toBe(1100);

    const startTime = Date.now();
    service.cleanup();
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete within 100ms
    expect(storage.size).toBe(100); // Only active records should remain
  });
});
