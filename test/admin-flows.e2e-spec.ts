import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin Flows (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  const targetUserId = 'test-user-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'AdminPass123!' });
    adminToken = loginRes.body?.access_token ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should suspend a user', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Suspicious activity during e2e test' })
      .expect(200);

    expect(res.body).toHaveProperty('status', 'suspended');
  });

  it('should change a user role', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'organizer' })
      .expect(200);

    expect(res.body).toHaveProperty('role', 'organizer');
  });

  it('should retrieve an audit log entry for the admin actions', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ userId: targetUserId })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('action');
    expect(res.body[0]).toHaveProperty('performedBy');
  });
});
