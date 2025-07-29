import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Throttle Integration', () => {
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

  describe('GET /api/events (with throttling)', () => {
    it('should return 200 for first request', () => {
      return request(app.getHttpServer())
        .get('/api/events?organizerId=org_1')
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-ratelimit-limit']).toBeDefined();
          expect(res.headers['x-ratelimit-remaining']).toBeDefined();
          expect(res.headers['x-ratelimit-reset']).toBeDefined();
          expect(res.headers['x-ratelimit-window']).toBe('hour');
        });
    });

    it('should decrement remaining requests', async () => {
      // First request
      const firstResponse = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_1')
        .expect(200);

      const firstRemaining = parseInt(firstResponse.headers['x-ratelimit-remaining']);

      // Second request
      const secondResponse = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_1')
        .expect(200);

      const secondRemaining = parseInt(secondResponse.headers['x-ratelimit-remaining']);

      expect(secondRemaining).toBe(firstRemaining - 1);
    });

    it('should track different organizers separately', async () => {
      // Request for org_1
      const org1Response = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_1')
        .expect(200);

      // Request for org_2
      const org2Response = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_2')
        .expect(200);

      // Both should have their own limits (FREE plan has 50 requests per hour)
      expect(parseInt(org1Response.headers['x-ratelimit-remaining'])).toBe(49);
      expect(parseInt(org2Response.headers['x-ratelimit-remaining'])).toBe(49);
    });

    it('should return 401 when organizer ID is missing', () => {
      return request(app.getHttpServer())
        .get('/api/events')
        .expect(401);
    });
  });

  describe('GET /api/events/public/:id (without throttling)', () => {
    it('should not include rate limit headers', () => {
      return request(app.getHttpServer())
        .get('/api/events/public/event_1')
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-ratelimit-limit']).toBeUndefined();
          expect(res.headers['x-ratelimit-remaining']).toBeUndefined();
        });
    });
  });

  describe('Different subscription plans', () => {
    it('should have different limits for different plans', async () => {
      // FREE plan (org_1) - 50 requests per hour
      const freeResponse = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_1')
        .expect(200);

      // BASIC plan (org_2) - 500 requests per hour
      const basicResponse = await request(app.getHttpServer())
        .get('/api/events?organizerId=org_2')
        .expect(200);

      expect(parseInt(freeResponse.headers['x-ratelimit-limit'])).toBe(50);
      expect(parseInt(basicResponse.headers['x-ratelimit-limit'])).toBe(500);
    });
  });
});
