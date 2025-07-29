import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { FunnelStage, FunnelActionType } from '../entities/funnel-action.entity';

describe('FunnelTracking (e2e)', () => {
  let app: INestApplication;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Session Management', () => {
    it('should start a new funnel session', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/session/start')
        .send({
          eventId: 'event-123',
          userId: 'user-456',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      sessionId = response.body.sessionId;
    });

    it('should get existing session for same user/event', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/session/start')
        .send({
          eventId: 'event-123',
          userId: 'user-456',
        })
        .expect(201);

      expect(response.body.sessionId).toBe(sessionId);
    });
  });

  describe('Action Tracking', () => {
    it('should track event view', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track/event-view')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });

    it('should track ticket selection', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track/ticket-selection')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
          ticketTier: 'VIP',
          price: 150.00,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });

    it('should track cart addition', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track/cart-add')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
          quantity: 2,
          totalPrice: 300.00,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });

    it('should track checkout start', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track/checkout-start')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });

    it('should track payment completion', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track/payment-complete')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
          purchaseId: 'purchase-789',
          totalSpent: 300.00,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });
  });

  describe('Generic Action Tracking', () => {
    it('should track custom funnel action', async () => {
      const response = await request(app.getHttpServer())
        .post('/funnel-tracking/track')
        .send({
          eventId: 'event-123',
          sessionId: sessionId,
          userId: 'user-456',
          stage: FunnelStage.PAYMENT_INFO,
          actionType: FunnelActionType.FORM_START,
          actionName: 'enter_payment_details',
          metadata: {
            paymentMethod: 'credit_card',
            amount: 300.00,
          },
          timeOnPage: 45,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.actionId).toBeDefined();
    });
  });

  describe('Session Completion', () => {
    it('should complete a session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/funnel-tracking/session/${sessionId}/complete`)
        .send({
          purchaseId: 'purchase-789',
          totalSpent: 300.00,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should abandon a session', async () => {
      // Create a new session for abandonment test
      const abandonResponse = await request(app.getHttpServer())
        .post('/funnel-tracking/session/start')
        .send({
          eventId: 'event-456',
          userId: 'user-789',
        })
        .expect(201);

      const abandonSessionId = abandonResponse.body.sessionId;

      const response = await request(app.getHttpServer())
        .post(`/funnel-tracking/session/${abandonSessionId}/abandon`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('should get funnel statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/funnel-tracking/stats/event-123')
        .expect(200);

      expect(response.body.eventId).toBe('event-123');
      expect(response.body.totalSessions).toBeGreaterThan(0);
      expect(response.body.stages).toBeDefined();
      expect(response.body.summary).toBeDefined();
    });

    it('should get funnel statistics with date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/funnel-tracking/stats/event-123?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.dateRange.startDate).toBeDefined();
      expect(response.body.dateRange.endDate).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session ID', async () => {
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/event-view')
        .send({
          eventId: 'event-123',
          sessionId: 'invalid-session-id',
          userId: 'user-456',
        })
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/funnel-tracking/track')
        .send({
          eventId: 'event-123',
          // Missing sessionId and stage
        })
        .expect(400);
    });
  });

  describe('Full Funnel Journey', () => {
    it('should complete a full funnel journey', async () => {
      // 1. Start session
      const sessionResponse = await request(app.getHttpServer())
        .post('/funnel-tracking/session/start')
        .send({
          eventId: 'event-full-journey',
          userId: 'user-full-journey',
        })
        .expect(201);

      const fullSessionId = sessionResponse.body.sessionId;

      // 2. Track event view
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/event-view')
        .send({
          eventId: 'event-full-journey',
          sessionId: fullSessionId,
          userId: 'user-full-journey',
        })
        .expect(201);

      // 3. Track ticket selection
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/ticket-selection')
        .send({
          eventId: 'event-full-journey',
          sessionId: fullSessionId,
          userId: 'user-full-journey',
          ticketTier: 'General',
          price: 50.00,
        })
        .expect(201);

      // 4. Track cart addition
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/cart-add')
        .send({
          eventId: 'event-full-journey',
          sessionId: fullSessionId,
          userId: 'user-full-journey',
          quantity: 1,
          totalPrice: 50.00,
        })
        .expect(201);

      // 5. Track checkout start
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/checkout-start')
        .send({
          eventId: 'event-full-journey',
          sessionId: fullSessionId,
          userId: 'user-full-journey',
        })
        .expect(201);

      // 6. Track payment completion
      await request(app.getHttpServer())
        .post('/funnel-tracking/track/payment-complete')
        .send({
          eventId: 'event-full-journey',
          sessionId: fullSessionId,
          userId: 'user-full-journey',
          purchaseId: 'purchase-full-journey',
          totalSpent: 50.00,
        })
        .expect(201);

      // 7. Verify funnel statistics
      const statsResponse = await request(app.getHttpServer())
        .get('/funnel-tracking/stats/event-full-journey')
        .expect(200);

      expect(statsResponse.body.totalSessions).toBeGreaterThan(0);
      expect(statsResponse.body.overallConversionRate).toBeGreaterThan(0);
      expect(statsResponse.body.stages.length).toBeGreaterThan(0);
    });
  });
}); 