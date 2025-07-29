import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SyncModule } from './sync.module';
import { SyncDestination } from './schemas/ticket-sales.schema';

describe('Sync Integration Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SyncModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/sync/initiate (POST)', () => {
    it('should initiate sync successfully', () => {
      return request(app.getHttpServer())
        .post('/sync/initiate')
        .send({
          destination: SyncDestination.BIGQUERY,
          batchSize: 1000,
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.syncId).toBeDefined();
          expect(res.body.status).toBe('pending');
          expect(res.body.destination).toBe(SyncDestination.BIGQUERY);
        });
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/sync/initiate')
        .send({
          destination: 'invalid-destination',
        })
        .expect(400);
    });
  });

  describe('/sync/status/:syncId (GET)', () => {
    it('should return 404 for non-existing sync job', () => {
      return request(app.getHttpServer())
        .get('/sync/status/non-existing-id')
        .expect(404);
    });
  });

  describe('/sync/jobs (GET)', () => {
    it('should return all sync jobs', () => {
      return request(app.getHttpServer())
        .get('/sync/jobs')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
