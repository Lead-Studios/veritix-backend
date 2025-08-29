import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { ApiUsage } from '../entities/api-usage.entity';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

@Injectable()
export class RateLimiterService {
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  };

  constructor(
    @InjectRepository(ApiUsage)
    private usageRepository: Repository<ApiUsage>,
  ) {}

  async checkRateLimit(apiKey: ApiKey, endpoint?: string): Promise<RateLimitResult> {
    const config = this.getRateLimitConfig(apiKey, endpoint);
    const windowStart = new Date(Date.now() - config.windowMs);
    
    // Count requests in current window
    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .where('usage.apiKeyId = :apiKeyId', { apiKeyId: apiKey.id })
      .andWhere('usage.timestamp >= :windowStart', { windowStart });

    if (endpoint) {
      queryBuilder.andWhere('usage.endpoint = :endpoint', { endpoint });
    }

    if (config.skipSuccessfulRequests) {
      queryBuilder.andWhere('usage.statusCode >= 400');
    }

    if (config.skipFailedRequests) {
      queryBuilder.andWhere('usage.statusCode < 400');
    }

    const requestCount = await queryBuilder.getCount();
    const resetTime = new Date(Date.now() + config.windowMs);
    const remaining = Math.max(0, config.maxRequests - requestCount);

    return {
      allowed: requestCount < config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: requestCount >= config.maxRequests ? Math.ceil(config.windowMs / 1000) : undefined,
    };
  }

  async checkMonthlyQuota(apiKey: ApiKey): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    resetDate: Date;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usedRequests = await this.usageRepository.count({
      where: {
        apiKeyId: apiKey.id,
        timestamp: MoreThan(monthStart),
      },
    });

    const remaining = Math.max(0, apiKey.monthlyQuota - usedRequests);

    return {
      allowed: usedRequests < apiKey.monthlyQuota,
      used: usedRequests,
      limit: apiKey.monthlyQuota,
      remaining,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  async getBurstLimitResult(apiKey: ApiKey): Promise<RateLimitResult> {
    // Implement burst limiting (e.g., 100 requests per minute)
    const burstConfig: RateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: Math.min(100, Math.floor(apiKey.rateLimit / 60)),
    };

    const windowStart = new Date(Date.now() - burstConfig.windowMs);
    
    const requestCount = await this.usageRepository.count({
      where: {
        apiKeyId: apiKey.id,
        timestamp: MoreThan(windowStart),
      },
    });

    const resetTime = new Date(Date.now() + burstConfig.windowMs);
    const remaining = Math.max(0, burstConfig.maxRequests - requestCount);

    return {
      allowed: requestCount < burstConfig.maxRequests,
      limit: burstConfig.maxRequests,
      remaining,
      resetTime,
      retryAfter: requestCount >= burstConfig.maxRequests ? 60 : undefined,
    };
  }

  async getGlobalRateLimit(tenantId?: string): Promise<RateLimitResult> {
    // Implement global rate limiting for tenant or entire system
    const globalConfig: RateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10000, // Global limit
    };

    const windowStart = new Date(Date.now() - globalConfig.windowMs);
    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .where('usage.timestamp >= :windowStart', { windowStart });

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    const requestCount = await queryBuilder.getCount();
    const resetTime = new Date(Date.now() + globalConfig.windowMs);
    const remaining = Math.max(0, globalConfig.maxRequests - requestCount);

    return {
      allowed: requestCount < globalConfig.maxRequests,
      limit: globalConfig.maxRequests,
      remaining,
      resetTime,
      retryAfter: requestCount >= globalConfig.maxRequests ? 60 : undefined,
    };
  }

  async getRateLimitHeaders(apiKey: ApiKey, endpoint?: string): Promise<Record<string, string>> {
    const [hourlyLimit, burstLimit, monthlyQuota] = await Promise.all([
      this.checkRateLimit(apiKey, endpoint),
      this.getBurstLimitResult(apiKey),
      this.checkMonthlyQuota(apiKey),
    ]);

    return {
      'X-RateLimit-Limit': hourlyLimit.limit.toString(),
      'X-RateLimit-Remaining': hourlyLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(hourlyLimit.resetTime.getTime() / 1000).toString(),
      'X-RateLimit-Burst-Limit': burstLimit.limit.toString(),
      'X-RateLimit-Burst-Remaining': burstLimit.remaining.toString(),
      'X-Monthly-Quota-Limit': monthlyQuota.limit.toString(),
      'X-Monthly-Quota-Remaining': monthlyQuota.remaining.toString(),
      'X-Monthly-Quota-Used': monthlyQuota.used.toString(),
    };
  }

  private getRateLimitConfig(apiKey: ApiKey, endpoint?: string): RateLimitConfig {
    // Custom rate limits based on API key tier or endpoint
    const baseConfig = {
      ...this.defaultConfig,
      maxRequests: apiKey.rateLimit,
    };

    // Endpoint-specific overrides
    if (endpoint) {
      const endpointOverrides = this.getEndpointOverrides();
      const override = endpointOverrides[endpoint];
      if (override) {
        return { ...baseConfig, ...override };
      }
    }

    return baseConfig;
  }

  private getEndpointOverrides(): Record<string, Partial<RateLimitConfig>> {
    return {
      '/api/v1/events': {
        maxRequests: 500, // Lower limit for event creation
        windowMs: 60 * 60 * 1000,
      },
      '/api/v1/tickets/purchase': {
        maxRequests: 100, // Very restrictive for purchases
        windowMs: 60 * 60 * 1000,
      },
      '/api/v1/analytics': {
        maxRequests: 50, // Analytics endpoints are expensive
        windowMs: 60 * 60 * 1000,
      },
    };
  }
}
