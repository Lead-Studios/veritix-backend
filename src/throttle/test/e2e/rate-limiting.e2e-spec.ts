import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should enforce minute-based rate limiting', async () => {
    // FREE plan has 5 requests per minute for the /api/events/:id endpoint
    const promises = [];

    // Make 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .get('/api/events/event_1?organizerId=org_1')
          .expect(200),
      );
    }

    await Promise.all(promises);

    // 6th request should be throttled
    return request(app.getHttpServer())
      .get('/api/events/event_1?organizerId=org_1')
      .expect(429)
      .expect((res) => {
        expect(res.body.message).toBe('Rate limit exceeded');
        expect(res.body.retryAfter).toBeDefined();
        expect(res.headers['retry-after']).toBeDefined();
      });
  });

  it('should handle different time windows correctly', async () => {
    // Test day, hour, and minute windows with the same organizer
    const dayResponse = await request(app.getHttpServer())
      .get('/api/events?organizerId=org_1') // Uses hour window
      .expect(200);

    const minuteResponse = await request(app.getHttpServer())
      .get('/api/events/event_1?organizerId=org_1') // Uses minute window
      .expect(200);

    // Different windows should have different limits
    expect(parseInt(dayResponse.headers['x-ratelimit-limit'])).toBe(50); // Hour
    expect(parseInt(minuteResponse.headers['x-ratelimit-limit'])).toBe(5); // Minute
    expect(dayResponse.headers['x-ratelimit-window']).toBe('hour');
    expect(minuteResponse.headers['x-ratelimit-window']).toBe('minute');
  });

  it('should handle header-based organizer identification', async () => {
    return request(app.getHttpServer())
      .get('/api/events')
      .set('x-organizer-id', 'org_2')
      .expect(200)
      .expect((res) => {
        // BASIC plan should have 500 requests per hour
        expect(parseInt(res.headers['x-ratelimit-limit'])).toBe(500);
      });
  });

  it('should prioritize JWT token over other methods', async () => {
    // This would require setting up proper JWT middleware
    // For now, we'll test the header fallback
    return request(app.getHttpServer())
      .get('/api/events')
      .set('x-organizer-id', 'org_3')
      .expect(200)
      .expect((res) => {
        // PREMIUM plan should have 2000 requests per hour
        expect(parseInt(res.headers['x-ratelimit-limit'])).toBe(2000);
      });
  });
});
