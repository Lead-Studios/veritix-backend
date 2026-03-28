import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../src/modules/users/users.module';
import { UserPreferenceEntity } from '../src/modules/users/entities/user-preference.entity';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt.guard';

describe('UserPreferences (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UserPreferenceEntity],
          synchronize: true,
        }),
        UsersModule,
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true }) // Allow all
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /users/preferences should return default preferences for new user', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/preferences')
      .set('x-user-id', 'user-1')
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      userId: 'user-1',
      theme: 'system',
    }));
  });

  it('PATCH /users/preferences should update theme', async () => {
    // Update to dark mode
    await request(app.getHttpServer())
      .patch('/users/preferences')
      .set('x-user-id', 'user-1')
      .send({ theme: 'dark' })
      .expect(200);

    // Verify update
    const response = await request(app.getHttpServer())
      .get('/users/preferences')
      .set('x-user-id', 'user-1')
      .expect(200);

    expect(response.body.theme).toBe('dark');
  });

  it('PATCH /users/preferences should reject invalid theme', async () => {
    await request(app.getHttpServer())
      .patch('/users/preferences')
      .set('x-user-id', 'user-1')
      .send({ theme: 'blue' }) // Invalid enum
      .expect(400);
  });

  it('should maintain separate preferences for different users', async () => {
    // User 2 defaults
    await request(app.getHttpServer())
      .get('/users/preferences')
      .set('x-user-id', 'user-2')
      .expect(200)
      .expect((res) => {
        expect(res.body.theme).toBe('system');
      });

    // User 1 still dark
    await request(app.getHttpServer())
      .get('/users/preferences')
      .set('x-user-id', 'user-1')
      .expect(200)
      .expect((res) => {
        expect(res.body.theme).toBe('dark');
      });
  });
});
