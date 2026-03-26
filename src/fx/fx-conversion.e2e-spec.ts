/**
 * Cross-Border FX Conversion — E2E tests
 *
 * Acceptance criteria coverage:
 *  1. GET  /fx/convert/quote  — locked rate, fee breakdown, quoteId, 60 s TTL
 *  2. POST /fx/convert        — executes at locked rate; rejects expired quote
 *  3. GET  /fx/fees           — mid-rate, markup %, provider fee, effective rate
 *  4. Conversion record fields: fromAmount, toAmount, rateUsed, feeCharged, quoteId
 *  5. GET  /fx/convert/history — paginated history
 *  6. Regulatory disclosure in quote response
 *
 * Constraint coverage:
 *  - Quote lock stored in Redis with 60 s TTL
 *  - Rate in conversion must match quoted rate exactly
 *  - Fee charged from source amount
 *  - Expired quote → 410 Gone
 *  - Duplicate conversion per quoteId → 409 Conflict
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';

import { AppModule } from '../src/app.module';
import { FxQuote, QuoteStatus } from '../src/modules/fx/entities/fx-quote.entity';
import { FxConversion } from '../src/modules/fx/entities/fx-conversion.entity';
import { FxConversionService, QUOTE_TTL_SECONDS } from '../src/modules/fx/services/fx-conversion.service';
import { FeeCalculatorService } from '../src/modules/fx/services/fee-calculator.service';
import { LoyaltyTier } from '../src/modules/loyalty/entities/loyalty-account.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.access_token;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('FX Conversion Engine (e2e)', () => {
  let app: INestApplication;
  let fxService: FxConversionService;
  let feeCalc: FeeCalculatorService;
  let quoteRepo: Repository<FxQuote>;
  let conversionRepo: Repository<FxConversion>;
  let redis: Redis;

  let aliceToken: string;
  let aliceId: string;

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    fxService      = module.get(FxConversionService);
    feeCalc        = module.get(FeeCalculatorService);
    quoteRepo      = module.get(getRepositoryToken(FxQuote));
    conversionRepo = module.get(getRepositoryToken(FxConversion));
    redis          = module.get<Redis>('default_IORedisModuleConnectionToken');

    aliceToken = await loginAs(app, 'alice@test.nexafx.io', 'TestPass123!');

    // Resolve Alice's userId
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    aliceId = me.body.id;
  });

  afterAll(async () => {
    // Cleanup test conversions and quotes
    await conversionRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :id', { id: aliceId })
      .execute();
    await quoteRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :id', { id: aliceId })
      .execute();
    await app.close();
  });

  // ── 1. FeeCalculatorService unit tests ─────────────────────────────────────

  describe('FeeCalculatorService', () => {
    const MID_RATE = 1580;

    it('deducts fee from source amount (not target)', () => {
      const b = feeCalc.calculate(100_000, MID_RATE, LoyaltyTier.BRONZE);
      // netFromAmount + feeAmount must equal fromAmount
      expect(b.netFromAmount + b.feeAmount).toBe(b.fromAmount);
    });

    it('toAmount is based on netFromAmount (after fee) × effectiveRate', () => {
      const b = feeCalc.calculate(100_000, MID_RATE, LoyaltyTier.BRONZE);
      const expected = Math.floor(b.netFromAmount * parseFloat(b.effectiveRate));
      expect(b.toAmount).toBe(expected);
    });

    it('effectiveRate is midRate reduced by markup', () => {
      const b = feeCalc.calculate(100_000, MID_RATE, LoyaltyTier.BRONZE);
      const markup = parseFloat(b.markupPct);
      const expectedEffective = MID_RATE * (1 - markup / 100);
      expect(parseFloat(b.effectiveRate)).toBeCloseTo(expectedEffective, 8);
    });

    it('PLATINUM tier has lower fee than BRONZE', () => {
      const bronze   = feeCalc.calculate(1_000_000, MID_RATE, LoyaltyTier.BRONZE);
      const platinum = feeCalc.calculate(1_000_000, MID_RATE, LoyaltyTier.PLATINUM);
      expect(platinum.feeAmount).toBeLessThan(bronze.feeAmount);
    });

    it('feeWaived removes provider fee (but rate markup still applies)', () => {
      const normal = feeCalc.calculate(100_000, MID_RATE, LoyaltyTier.BRONZE, false);
      const waived = feeCalc.calculate(100_000, MID_RATE, LoyaltyTier.BRONZE, true);
      expect(waived.feeAmount).toBe(0);
      expect(parseFloat(waived.effectiveRate)).toBeCloseTo(parseFloat(normal.effectiveRate), 8);
    });
  });

  // ── 2. GET /fx/convert/quote ───────────────────────────────────────────────

  describe('GET /fx/convert/quote', () => {
    let quoteResponse: any;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/convert/quote')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 10_000 })
        .expect(200);
      quoteResponse = res.body;
    });

    it('returns a quoteId (UUID)', () => {
      expect(quoteResponse.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('returns locked effectiveRate, midRate, markupPct', () => {
      expect(quoteResponse.effectiveRate).toBeDefined();
      expect(quoteResponse.midRate).toBeDefined();
      expect(quoteResponse.markupPct).toBeDefined();
      expect(parseFloat(quoteResponse.effectiveRate)).toBeLessThan(
        parseFloat(quoteResponse.midRate),
      );
    });

    it('returns fee breakdown: feeAmount, netFromAmount, toAmount', () => {
      expect(quoteResponse.feeAmount).toBeGreaterThanOrEqual(0);
      expect(quoteResponse.netFromAmount).toBe(
        quoteResponse.fromAmount - quoteResponse.feeAmount,
      );
      expect(quoteResponse.toAmount).toBeGreaterThan(0);
    });

    it('returns ttlSeconds = 60', () => {
      expect(quoteResponse.ttlSeconds).toBe(QUOTE_TTL_SECONDS);
    });

    it('includes regulatoryDisclosure text', () => {
      expect(typeof quoteResponse.regulatoryDisclosure).toBe('string');
      expect(quoteResponse.regulatoryDisclosure.length).toBeGreaterThan(10);
    });

    it('stores the quote in Redis with correct TTL', async () => {
      const ttl = await redis.ttl(`fx:quote:${quoteResponse.id}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(QUOTE_TTL_SECONDS);
    });

    it('persists a PENDING quote row to the database', async () => {
      const dbQuote = await quoteRepo.findOne({ where: { id: quoteResponse.id } });
      expect(dbQuote).toBeDefined();
      expect(dbQuote!.status).toBe(QuoteStatus.PENDING);
    });

    it('returns 400 for same-currency pair', async () => {
      await request(app.getHttpServer())
        .get('/fx/convert/quote')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'USD', fromAmount: 10_000 })
        .expect(400);
    });

    it('returns 400 for zero/negative amount', async () => {
      await request(app.getHttpServer())
        .get('/fx/convert/quote')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 0 })
        .expect(400);
    });
  });

  // ── 3. POST /fx/convert ────────────────────────────────────────────────────

  describe('POST /fx/convert', () => {
    let freshQuote: any;

    beforeEach(async () => {
      // Obtain a fresh quote before each execute test
      const res = await request(app.getHttpServer())
        .get('/fx/convert/quote')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 5_000 })
        .expect(200);
      freshQuote = res.body;
    });

    it('executes conversion and returns complete record', async () => {
      const res = await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(201);

      const conv = res.body;
      expect(conv.quoteId).toBe(freshQuote.id);
      expect(conv.fromAmount).toBe(freshQuote.fromAmount);
      expect(conv.feeCharged).toBe(freshQuote.feeAmount);
      expect(conv.netFromAmount).toBe(freshQuote.netFromAmount);
      expect(conv.toAmount).toBe(freshQuote.toAmount);
      // CRITICAL: rate in conversion must match quote exactly
      expect(conv.rateUsed).toBe(freshQuote.effectiveRate);
    });

    it('conversion record contains all required audit fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(201);

      const conv = res.body;
      expect(conv.id).toBeDefined();
      expect(conv.fromCurrency).toBe('USD');
      expect(conv.toCurrency).toBe('NGN');
      expect(conv.fromAmount).toBeDefined();
      expect(conv.toAmount).toBeDefined();
      expect(conv.rateUsed).toBeDefined();
      expect(conv.feeCharged).toBeDefined();
      expect(conv.quoteId).toBeDefined();
      expect(conv.midRateAtQuote).toBeDefined();
      expect(conv.markupPct).toBeDefined();
      expect(conv.createdAt).toBeDefined();
    });

    it('marks the DB quote as EXECUTED after conversion', async () => {
      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(201);

      const dbQuote = await quoteRepo.findOne({ where: { id: freshQuote.id } });
      expect(dbQuote!.status).toBe(QuoteStatus.EXECUTED);
      expect(dbQuote!.resolvedAt).not.toBeNull();
    });

    it('invalidates Redis key after execution', async () => {
      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(201);

      const redisVal = await redis.get(`fx:quote:${freshQuote.id}`);
      expect(redisVal).toBeNull();
    });

    it('returns 409 Conflict on duplicate execution attempt', async () => {
      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(201);

      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(409);
    });

    it('returns 410 Gone for an expired quote', async () => {
      // Manually delete the Redis key to simulate TTL expiry
      const expiredRes = await request(app.getHttpServer())
        .get('/fx/convert/quote')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 1_000 })
        .expect(200);

      await redis.del(`fx:quote:${expiredRes.body.id}`);

      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: expiredRes.body.id })
        .expect(410);
    });

    it('returns 400 when quoteId belongs to a different user', async () => {
      const bobToken = await loginAs(app, 'bob@test.nexafx.io', 'TestPass123!');
      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ quoteId: freshQuote.id })
        .expect(400);
    });

    it('returns 422/400 for invalid quoteId format', async () => {
      await request(app.getHttpServer())
        .post('/fx/convert')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ quoteId: 'not-a-uuid' })
        .expect(400);
    });
  });

  // ── 4. GET /fx/fees ────────────────────────────────────────────────────────

  describe('GET /fx/fees', () => {
    it('returns full cost breakdown', async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/fees')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 100_000 })
        .expect(200);

      const body = res.body;
      expect(body.midRate).toBeDefined();
      expect(body.markupPct).toBeDefined();
      expect(body.effectiveRate).toBeDefined();
      expect(body.feeAmount).toBeDefined();
      expect(body.feePct).toBeDefined();
      expect(body.totalCostPct).toBeDefined();
      expect(body.costComponents).toBeDefined();
    });

    it('effective rate is strictly less than mid rate', async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/fees')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 100_000 })
        .expect(200);

      expect(parseFloat(res.body.effectiveRate)).toBeLessThan(
        parseFloat(res.body.midRate),
      );
    });

    it('PLATINUM tier has lower fee % than BRONZE', async () => {
      const bronzeRes = await request(app.getHttpServer())
        .get('/fx/fees')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 500_000, tier: LoyaltyTier.BRONZE })
        .expect(200);

      const platinumRes = await request(app.getHttpServer())
        .get('/fx/fees')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 500_000, tier: LoyaltyTier.PLATINUM })
        .expect(200);

      expect(parseFloat(platinumRes.body.feePct)).toBeLessThan(
        parseFloat(bronzeRes.body.feePct),
      );
    });
  });

  // ── 5. GET /fx/convert/history ─────────────────────────────────────────────

  describe('GET /fx/convert/history', () => {
    beforeAll(async () => {
      // Seed two conversions
      for (let i = 0; i < 2; i++) {
        const q = await request(app.getHttpServer())
          .get('/fx/convert/quote')
          .set('Authorization', `Bearer ${aliceToken}`)
          .query({ fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 1_000 + i * 100 })
          .expect(200);
        await request(app.getHttpServer())
          .post('/fx/convert')
          .set('Authorization', `Bearer ${aliceToken}`)
          .send({ quoteId: q.body.id })
          .expect(201);
      }
    });

    it('returns paginated history newest-first', async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/convert/history')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);

      const dates = res.body.data.map((c: any) => new Date(c.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('filters by currency pair', async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/convert/history')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ fromCurrency: 'USD', toCurrency: 'NGN' })
        .expect(200);

      res.body.data.forEach((c: any) => {
        expect(c.fromCurrency).toBe('USD');
        expect(c.toCurrency).toBe('NGN');
      });
    });

    it('does not return other users\' conversions', async () => {
      const bobToken = await loginAs(app, 'bob@test.nexafx.io', 'TestPass123!');
      const res = await request(app.getHttpServer())
        .get('/fx/convert/history')
        .set('Authorization', `Bearer ${bobToken}`)
        .query({ page: 1, limit: 50 })
        .expect(200);

      res.body.data.forEach((c: any) => {
        expect(c.userId).not.toBe(aliceId);
      });
    });

    it('respects limit and page boundaries', async () => {
      const res = await request(app.getHttpServer())
        .get('/fx/convert/history')
        .set('Authorization', `Bearer ${aliceToken}`)
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // ── 6. Regulatory disclosure per jurisdiction ──────────────────────────────

  describe('Regulatory disclosure', () => {
    it('NG jurisdiction returns CBN disclosure', async () => {
      // Service-level test (avoids needing a Nigerian user fixture)
      const disc = (fxService as any).disclosure;
      const text = disc.getDisclosure('NG');
      expect(text).toContain('CBN');
    });

    it('GB jurisdiction returns FCA disclosure', () => {
      const disc = (fxService as any).disclosure;
      expect(disc.getDisclosure('GB')).toContain('FCA');
    });

    it('Unknown jurisdiction returns global disclosure', () => {
      const disc = (fxService as any).disclosure;
      const text = disc.getDisclosure('XX');
      expect(text).toContain('60 seconds');
    });

    it('null jurisdiction returns global disclosure', () => {
      const disc = (fxService as any).disclosure;
      expect(disc.getDisclosure(null)).toContain('mid-market rate');
    });
  });
});
