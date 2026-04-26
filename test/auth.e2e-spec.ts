import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth E2E Flow', () => {
  let app: INestApplication;

  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    fullName: 'Test User',
  };

  let accessToken: string;
  let refreshToken: string;
  let otpCode = '123456';

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    // cleanup test database here if needed

    await app.close();
  });

  it('POST /auth/register → 201', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);
  });

  it('POST /auth/verify-otp → 200 + tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({
        email: testUser.email,
        otp: otpCode,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('POST /auth/login → 200 + tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('GET /auth/me → 200 + user without password', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.email).toBe(testUser.email);
    expect(response.body).not.toHaveProperty('password');
  });

  it('POST /auth/refresh-token → 200 + new tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({
        refreshToken,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('POST /auth/logout → 200', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refreshToken,
      })
      .expect(200);
  });

  it('GET /auth/me with old token → 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});