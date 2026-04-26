import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Full Verification Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  const ticketCode = 'TEST-TICKET-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'organizer@test.com', password: 'Password123!' });
    authToken = loginRes.body?.access_token ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully scan a valid ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ticketCode })
      .expect(200);

    expect(res.body).toHaveProperty('valid', true);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject a double-scan of the same ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ticketCode })
      .expect(409);

    expect(res.body.message).toMatch(/already (used|scanned)/i);
  });

  it('should reject an early scan before the event window', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ticketCode: 'FUTURE-EVENT-TICKET-001' })
      .expect(400);

    expect(res.body.message).toMatch(/early|not yet|before/i);
  });
});
