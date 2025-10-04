import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Ticket Purchase Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await dataSource.synchronize(true); // Reset DB for tests
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user → logs in → purchases ticket', async () => {
    // 1. Register
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@mail.com', password: '123456' })
      .expect(201);

    expect(userRes.body.email).toBe('test@mail.com');

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@mail.com', password: '123456' })
      .expect(200);

    const token = loginRes.body.access_token;
    expect(token).toBeDefined();

    // 3. Purchase Ticket
    const ticketRes = await request(app.getHttpServer())
      .post('/tickets/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: 1, quantity: 2 })
      .expect(201);

    expect(ticketRes.body).toHaveProperty('id');
    expect(ticketRes.body.quantity).toBe(2);
  });
});
