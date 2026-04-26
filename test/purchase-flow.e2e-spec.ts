import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Full Purchase Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'Password123!' });
    authToken = loginRes.body?.access_token ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should place an order for a ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId: 'test-event-id',
        quantity: 1,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
    orderId = res.body.id;
  });

  it('should simulate a successful payment for the order', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: 'paystack',
        reference: `test-ref-${Date.now()}`,
      })
      .expect(200);

    expect(res.body).toHaveProperty('status');
  });

  it('should confirm that tickets were issued after payment', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}/tickets`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('ticketCode');
  });
});
