import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserRole } from '../../src/users/enums/user-role.enum';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      ThrottlerModule.forRoot([
        {
          ttl: 60000,
          limit: 100,
        },
      ]),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'postgres',
          url:
            configService.get<string>('TEST_DATABASE_URL') ||
            configService.get<string>('DATABASE_URL'),
          synchronize: false,
          runMigrations: true,
          migrationsTableName: 'migrations',
          autoLoadEntities: true,
          dropSchema: true, // Drop schema for clean tests
        }),
      }),
      // Import other modules as needed, but for simplicity, use AppModule
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

export async function getAccessToken(
  app: INestApplication,
  role: UserRole = UserRole.SUBSCRIBER,
): Promise<string> {
  // Create a test user
  const testUser = {
    email: `test-${role.toLowerCase()}-${Date.now()}@example.com`,
    password: 'Password123!',
    fullName: 'Test User',
    role,
  };

  // Register
  await request(app.getHttpServer())
    .post('/auth/register')
    .send(testUser)
    .expect(201);

  // Verify OTP (assuming OTP is 123456 for tests)
  const response = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      email: testUser.email,
      otp: '123456',
    })
    .expect(200);

  return response.body.accessToken;
}
