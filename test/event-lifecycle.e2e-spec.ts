import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Event Lifecycle (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdEventId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Obtain an auth token for subsequent requests
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' });
    authToken = loginRes.body?.access_token ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new event', async () => {
    const res = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Test Event',
        description: 'Created during e2e lifecycle test',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Lagos',
        ticketPrice: 5000,
        totalTickets: 100,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    createdEventId = res.body.id;
  });

  it('should publish the created event', async () => {
    await request(app.getHttpServer())
      .patch(`/events/${createdEventId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('should update the published event', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/events/${createdEventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Updated description during e2e test' })
      .expect(200);

    expect(res.body.description).toBe('Updated description during e2e test');
  });

  it('should delete the event', async () => {
    await request(app.getHttpServer())
      .delete(`/events/${createdEventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
