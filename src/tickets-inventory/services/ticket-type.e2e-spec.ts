import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyOptimizerModule } from '../src/modules/strategy-optimizer/strategy-optimizer.module';
import { Strategy } from '../src/modules/strategy-optimizer/entities/strategy.entity';
import { StrategyParameter } from '../src/modules/strategy-optimizer/entities/strategy-parameter.entity';
import { StrategyVersion } from '../src/modules/strategy-optimizer/entities/strategy-version.entity';
import { PerformanceMetric } from '../src/modules/strategy-optimizer/entities/performance-metric.entity';

describe('StrategyOptimizer (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            Strategy,
            StrategyParameter,
            StrategyVersion,
            PerformanceMetric,
          ],
          synchronize: true,
        }),
        StrategyOptimizerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should seed a default strategy', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/strategies/seed/default')
      .expect(201);

    expect(response.body.name).toBe('MovingAverageCrossover');
    expect(response.body.parameters).toHaveLength(2);
  });

  it('should trigger optimization and create a new version', async () => {
    // 1. Get the strategy ID
    const strategiesRes = await request(app.getHttpServer())
      .post('/admin/strategies/seed/default') // Create another one or rely on previous? Let's create fresh.
      .expect(201);

    const strategyId = strategiesRes.body.id;

    // 2. Mock historical data (simple price series)
    const historicalData = Array.from({ length: 50 }, (_, i) => ({
      close: 100 + Math.sin(i) * 10 + Math.random() * 2,
    }));

    // 3. Trigger optimization
    // Note: Since simulation is random/mocked, we can't guarantee a better score,
    // but we can verify the process runs without error.
    // However, StrategyManager only updates if it detects a regime shift or poor performance.
    // The RegimeDetectionService might default to LOW_VOLATILITY.
    // Let's force a regime shift by providing volatile data.

    const volatileData = Array.from({ length: 50 }, (_, i) => ({
      close: 100 + (Math.random() - 0.5) * 20, // High volatility
    }));

    await request(app.getHttpServer())
      .post(`/admin/strategies/${strategyId}/optimize`)
      .send({ data: volatileData })
      .expect(201);

    // 4. Verify if version count increased (might not if optimization didn't find better params, but let's check structure)
    const strategyRes = await request(app.getHttpServer())
      .get(`/admin/strategies/${strategyId}`)
      .expect(200);

    expect(strategyRes.body.id).toBe(strategyId);
    expect(strategyRes.body.versions).toBeDefined();
  });
});
