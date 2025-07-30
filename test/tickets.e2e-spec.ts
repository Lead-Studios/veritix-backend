require('dotenv').config();
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('TicketsController (e2e)', () => {
  let app: INestApplication;
  let orderId: string;

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

  it('POST /tickets/purchase - success (Stripe test token)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/purchase')
      .send({
        eventId: 'event1',
        ticketQuantity: 2,
        billingDetails: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
        },
        address: {
          country: 'Country',
          state: 'State',
          city: 'City',
          street: '123 Main St',
          postalCode: '12345',
        },
        paymentToken: 'pm_card_visa',
      })
      .expect(201);
    expect(res.body).toHaveProperty('receiptId');
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('event');
    expect(res.body).toHaveProperty('ticket');
    orderId = res.body.receiptId;
  });

  it('POST /tickets/purchase - payment failure (Stripe test token)', async () => {
    await request(app.getHttpServer())
      .post('/tickets/purchase')
      .send({
        eventId: 'event1',
        ticketQuantity: 1,
        billingDetails: {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phoneNumber: '9876543210',
        },
        address: {
          country: 'Country',
          state: 'State',
          city: 'City',
          street: '456 Main St',
          postalCode: '54321',
        },
        paymentToken: 'pm_card_chargeDeclined',
      })
      .expect(500);
  });

  it('POST /tickets/purchase - validation error', async () => {
    await request(app.getHttpServer())
      .post('/tickets/purchase')
      .send({})
      .expect(400);
  });

  it('GET /tickets/receipt/:orderId - success', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tickets/receipt/${orderId}`)
      .expect(200);
    expect(res.body).toHaveProperty('receiptId', orderId);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('event');
    expect(res.body).toHaveProperty('ticket');
  });

  it('GET /tickets/receipt/:orderId - not found', async () => {
    await request(app.getHttpServer())
      .get('/tickets/receipt/invalid-order-id')
      .expect(404);
  });
});
