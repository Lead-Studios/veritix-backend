import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { FxQuote, QuoteStatus } from '../entities/fx-quote.entity';
import { FxConversion, ConversionStatus } from '../entities/fx-conversion.entity';
import { FeeCalculatorService } from './fee-calculator.service';
import { RegulatoryDisclosureService } from './regulatory-disclosure.service';
import { LoyaltyTier } from '../../loyalty/entities/loyalty-account.entity';

export const QUOTE_TTL_SECONDS = 60;
const REDIS_QUOTE_PREFIX = 'fx:quote:';

/** Shape stored in Redis for quote validation */
interface RedisQuotePayload {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  netFromAmount: number;
  toAmount: number;
  effectiveRate: string;
  midRate: string;
  markupPct: string;
  feeAmount: number;
  jurisdiction: string | null;
  expiresAt: number;
}

export interface QuoteRequestDto {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;     // minor units
  /** Loyalty tier so the fee calculator can apply discounts */
  tier?: LoyaltyTier;
  feeWaived?: boolean;
}

export interface ConvertRequestDto {
  quoteId: string;
}

export interface ConversionHistoryQuery {
  page?: number;
  limit?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

@Injectable()
export class FxConversionService {
  private readonly logger = new Logger(FxConversionService.name);

  constructor(
    @InjectRepository(FxQuote)
    private readonly quoteRepo: Repository<FxQuote>,

    @InjectRepository(FxConversion)
    private readonly conversionRepo: Repository<FxConversion>,

    @InjectRedis()
    private readonly redis: Redis,

    private readonly feeCalc: FeeCalculatorService,
    private readonly disclosure: RegulatoryDisclosureService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Quote ──────────────────────────────────────────────────────────────────

  /**
   * GET /fx/convert/quote
   * Fetches the live mid-rate, calculates fees, stores the quote in Redis,
   * persists a PENDING row to the DB, and returns the full breakdown.
   */
  async createQuote(
    userId: string,
    dto: QuoteRequestDto,
    userCountry?: string | null,
  ): Promise<FxQuote & { ttlSeconds: number; regulatoryDisclosure: string }> {
    const { fromCurrency, toCurrency, fromAmount } = dto;

    this.validateCurrencyPair(fromCurrency, toCurrency);
    if (fromAmount <= 0) throw new BadRequestException('fromAmount must be positive');

    // Fetch live mid-rate (injected provider abstraction)
    const midRate = await this.fetchMidRate(fromCurrency, toCurrency);

    const breakdown = this.feeCalc.calculate(
      fromAmount,
      midRate,
      dto.tier ?? LoyaltyTier.BRONZE,
      dto.feeWaived ?? false,
    );

    const jurisdiction      = this.disclosure.extractJurisdiction({ country: userCountry });
    const regulatoryText    = this.disclosure.getDisclosure(jurisdiction);
    const expiresAt         = Date.now() + QUOTE_TTL_SECONDS * 1_000;

    // Persist quote row (status = PENDING)
    const quote = this.quoteRepo.create({
      userId,
      fromCurrency,
      toCurrency,
      fromAmount,
      midRate:             breakdown.midRate,
      markupPct:           breakdown.markupPct,
      effectiveRate:       breakdown.effectiveRate,
      feeAmount:           breakdown.feeAmount,
      netFromAmount:       breakdown.netFromAmount,
      toAmount:            breakdown.toAmount,
      expiresAt,
      jurisdiction,
      regulatoryDisclosure: regulatoryText,
      status:              QuoteStatus.PENDING,
    });
    const savedQuote = await this.quoteRepo.save(quote);

    // Store in Redis with TTL — Redis is the authoritative lock
    const redisPayload: RedisQuotePayload = {
      userId,
      fromCurrency,
      toCurrency,
      fromAmount,
      netFromAmount: breakdown.netFromAmount,
      toAmount:      breakdown.toAmount,
      effectiveRate: breakdown.effectiveRate,
      midRate:       breakdown.midRate,
      markupPct:     breakdown.markupPct,
      feeAmount:     breakdown.feeAmount,
      jurisdiction,
      expiresAt,
    };
    await this.redis.set(
      `${REDIS_QUOTE_PREFIX}${savedQuote.id}`,
      JSON.stringify(redisPayload),
      'EX',
      QUOTE_TTL_SECONDS,
    );

    this.logger.log(
      `Quote ${savedQuote.id} created: ${fromAmount} ${fromCurrency} → ${breakdown.toAmount} ${toCurrency}`,
    );

    return { ...savedQuote, ttlSeconds: QUOTE_TTL_SECONDS, regulatoryDisclosure: regulatoryText };
  }

  // ── Execute ────────────────────────────────────────────────────────────────

  /**
   * POST /fx/convert
   * Validates the quote against Redis, ensures rate integrity, then atomically
   * writes the FxConversion record and marks the quote EXECUTED.
   */
  async executeConversion(
    userId: string,
    dto: ConvertRequestDto,
  ): Promise<FxConversion> {
    const { quoteId } = dto;

    // ── 1. Validate quote in Redis ────────────────────────────────────────────
    const raw = await this.redis.get(`${REDIS_QUOTE_PREFIX}${quoteId}`);
    if (!raw) {
      // Attempt to give a better error by reading the DB row
      const dbQuote = await this.quoteRepo.findOne({ where: { id: quoteId } });
      if (dbQuote?.status === QuoteStatus.EXECUTED) {
        throw new ConflictException('This quote has already been used');
      }
      throw new GoneException('Quote has expired or does not exist');
    }

    const payload: RedisQuotePayload = JSON.parse(raw);

    // ── 2. Ownership check ────────────────────────────────────────────────────
    if (payload.userId !== userId) {
      throw new BadRequestException('Quote does not belong to this user');
    }

    // ── 3. Expiry double-check (Redis TTL is authoritative but adds safety) ──
    if (Date.now() > payload.expiresAt) {
      await this.redis.del(`${REDIS_QUOTE_PREFIX}${quoteId}`);
      throw new GoneException('Quote has expired');
    }

    // ── 4. Atomic write ────────────────────────────────────────────────────────
    const conversion = await this.dataSource.transaction(async (em) => {
      // Prevent duplicate conversions for the same quoteId (unique index guard)
      const existing = await em.getRepository(FxConversion).findOne({
        where: { quoteId },
      });
      if (existing) throw new ConflictException('Conversion already executed for this quote');

      const conv = em.getRepository(FxConversion).create({
        userId,
        quoteId,
        fromCurrency:   payload.fromCurrency,
        toCurrency:     payload.toCurrency,
        fromAmount:     payload.fromAmount,
        feeCharged:     payload.feeAmount,
        netFromAmount:  payload.netFromAmount,
        toAmount:       payload.toAmount,
        rateUsed:       payload.effectiveRate,   // MUST match quote exactly
        midRateAtQuote: payload.midRate,
        markupPct:      payload.markupPct,
        status:         ConversionStatus.COMPLETED,
        jurisdiction:   payload.jurisdiction,
      });
      await em.save(conv);

      // Mark DB quote as EXECUTED
      await em.getRepository(FxQuote).update(quoteId, {
        status:     QuoteStatus.EXECUTED,
        resolvedAt: new Date(),
      });

      return conv;
    });

    // ── 5. Invalidate Redis key (consume the lock) ────────────────────────────
    await this.redis.del(`${REDIS_QUOTE_PREFIX}${quoteId}`);

    this.logger.log(
      `Conversion ${conversion.id} executed: ${conversion.fromAmount} ` +
      `${conversion.fromCurrency} → ${conversion.toAmount} ${conversion.toCurrency} ` +
      `@ ${conversion.rateUsed} (quote ${quoteId})`,
    );

    return conversion;
  }

  // ── Fee info ───────────────────────────────────────────────────────────────

  /**
   * GET /fx/fees
   * Returns a full fee breakdown for a given pair and amount without
   * locking a quote (informational only).
   */
  async getFeeBreakdown(
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    tier: LoyaltyTier = LoyaltyTier.BRONZE,
  ) {
    this.validateCurrencyPair(fromCurrency, toCurrency);
    const midRate  = await this.fetchMidRate(fromCurrency, toCurrency);
    const breakdown = this.feeCalc.calculate(fromAmount, midRate, tier);
    return this.feeCalc.describeBreakdown(breakdown, fromCurrency, toCurrency);
  }

  // ── History ────────────────────────────────────────────────────────────────

  /**
   * GET /fx/convert/history
   * Returns paginated, most-recent-first conversion history for the user.
   */
  async getHistory(
    userId: string,
    query: ConversionHistoryQuery,
  ): Promise<{ data: FxConversion[]; total: number; page: number; limit: number }> {
    const page  = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.conversionRepo
      .createQueryBuilder('c')
      .where('c.userId = :userId', { userId })
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.fromCurrency) {
      qb.andWhere('c.fromCurrency = :fc', { fc: query.fromCurrency.toUpperCase() });
    }
    if (query.toCurrency) {
      qb.andWhere('c.toCurrency = :tc', { tc: query.toCurrency.toUpperCase() });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Fetch mid-market rate from your rate provider.
   * Replace this stub with your actual RateProviderService injection.
   */
  private async fetchMidRate(from: string, to: string): Promise<number> {
    // TODO: inject RateProviderService and call e.g.:
    //   return this.rateProvider.getMidRate(from, to);
    //
    // Stub rates for development / tests:
    const STUB_RATES: Record<string, number> = {
      'USD_NGN': 1580.00,
      'NGN_USD': 1 / 1580.00,
      'GBP_USD': 1.27,
      'USD_GBP': 1 / 1.27,
      'EUR_USD': 1.09,
      'USD_EUR': 1 / 1.09,
      'USD_GHS': 14.50,
      'GHS_USD': 1 / 14.50,
    };
    const key  = `${from}_${to}`;
    const rate = STUB_RATES[key];
    if (!rate) throw new BadRequestException(`Currency pair ${from}/${to} not supported`);
    return rate;
  }

  private validateCurrencyPair(from: string, to: string): void {
    if (from.length !== 3 || to.length !== 3) {
      throw new BadRequestException('Currency codes must be ISO-4217 (3 characters)');
    }
    if (from.toUpperCase() === to.toUpperCase()) {
      throw new BadRequestException('Source and target currency must differ');
    }
  }
}
