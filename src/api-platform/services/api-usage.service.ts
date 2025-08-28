import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ApiUsage, HttpMethod, ApiResponseStatus } from '../entities/api-usage.entity';
import { ApiKey } from '../entities/api-key.entity';

export interface CreateApiUsageDto {
  endpoint: string;
  method: HttpMethod;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  requestHeaders?: Record<string, string>;
  queryParams?: Record<string, any>;
  errorMessage?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UsageAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerDay: Array<{ date: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  statusCodeDistribution: Record<number, number>;
  errorRate: number;
}

@Injectable()
export class ApiUsageService {
  constructor(
    @InjectRepository(ApiUsage)
    private usageRepository: Repository<ApiUsage>,
  ) {}

  async recordUsage(apiKey: ApiKey, usageData: CreateApiUsageDto): Promise<ApiUsage> {
    const status = this.determineStatus(usageData.statusCode, usageData.errorMessage);

    const usage = this.usageRepository.create({
      ...usageData,
      status,
      apiKeyId: apiKey.id,
      tenantId: usageData.tenantId || apiKey.tenantId,
      userId: usageData.userId || apiKey.userId,
    });

    return this.usageRepository.save(usage);
  }

  async getUsageAnalytics(
    apiKeyId?: string,
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageAnalytics> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage');

    if (apiKeyId) {
      queryBuilder.where('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('usage.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const usageData = await queryBuilder.getMany();

    return this.calculateAnalytics(usageData);
  }

  async getDailyUsage(
    apiKeyId?: string,
    tenantId?: string,
    days = 30,
  ): Promise<Array<{ date: string; requests: number; errors: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .select([
        'DATE(usage.timestamp) as date',
        'COUNT(*) as requests',
        'SUM(CASE WHEN usage.status = :errorStatus THEN 1 ELSE 0 END) as errors',
      ])
      .where('usage.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .setParameter('errorStatus', ApiResponseStatus.ERROR)
      .groupBy('DATE(usage.timestamp)')
      .orderBy('date', 'ASC');

    if (apiKeyId) {
      queryBuilder.andWhere('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder.getRawMany();
  }

  async getTopEndpoints(
    apiKeyId?: string,
    tenantId?: string,
    limit = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ endpoint: string; method: string; count: number; avgResponseTime: number }>> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .select([
        'usage.endpoint as endpoint',
        'usage.method as method',
        'COUNT(*) as count',
        'AVG(usage.responseTime) as avgResponseTime',
      ])
      .groupBy('usage.endpoint, usage.method')
      .orderBy('count', 'DESC')
      .limit(limit);

    if (apiKeyId) {
      queryBuilder.where('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('usage.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return queryBuilder.getRawMany();
  }

  async getErrorAnalytics(
    apiKeyId?: string,
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalErrors: number;
    errorsByEndpoint: Array<{ endpoint: string; count: number }>;
    errorsByStatusCode: Record<number, number>;
    commonErrors: Array<{ message: string; count: number }>;
  }> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .where('usage.status = :errorStatus', { errorStatus: ApiResponseStatus.ERROR });

    if (apiKeyId) {
      queryBuilder.andWhere('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('usage.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const errors = await queryBuilder.getMany();

    const errorsByEndpoint = this.groupBy(errors, 'endpoint');
    const errorsByStatusCode = this.groupBy(errors, 'statusCode');
    const commonErrors = this.groupBy(errors.filter(e => e.errorMessage), 'errorMessage');

    return {
      totalErrors: errors.length,
      errorsByEndpoint: Object.entries(errorsByEndpoint).map(([endpoint, count]) => ({
        endpoint,
        count: count as number,
      })),
      errorsByStatusCode,
      commonErrors: Object.entries(commonErrors)
        .map(([message, count]) => ({ message, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  async getPerformanceMetrics(
    apiKeyId?: string,
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgResponseTime: number }>;
  }> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage');

    if (apiKeyId) {
      queryBuilder.where('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('usage.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const usageData = await queryBuilder.getMany();
    const responseTimes = usageData.map(u => Number(u.responseTime)).sort((a, b) => a - b);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p50ResponseTime = this.percentile(responseTimes, 0.5);
    const p95ResponseTime = this.percentile(responseTimes, 0.95);
    const p99ResponseTime = this.percentile(responseTimes, 0.99);

    // Get slowest endpoints
    const endpointPerformance = this.groupByWithAverage(usageData, 'endpoint', 'responseTime');
    const slowestEndpoints = Object.entries(endpointPerformance)
      .map(([endpoint, avgTime]) => ({ endpoint, avgResponseTime: avgTime as number }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    return {
      averageResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      slowestEndpoints,
    };
  }

  async getRateLimitingStats(
    apiKeyId?: string,
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRateLimited: number;
    rateLimitedByHour: Array<{ hour: string; count: number }>;
    topRateLimitedEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage')
      .where('usage.status = :rateLimitedStatus', { rateLimitedStatus: ApiResponseStatus.RATE_LIMITED });

    if (apiKeyId) {
      queryBuilder.andWhere('usage.apiKeyId = :apiKeyId', { apiKeyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('usage.tenantId = :tenantId', { tenantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('usage.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const rateLimitedRequests = await queryBuilder.getMany();

    const rateLimitedByHour = this.groupBy(
      rateLimitedRequests,
      (usage) => usage.timestamp.toISOString().slice(0, 13) + ':00:00'
    );

    const topRateLimitedEndpoints = this.groupBy(rateLimitedRequests, 'endpoint');

    return {
      totalRateLimited: rateLimitedRequests.length,
      rateLimitedByHour: Object.entries(rateLimitedByHour).map(([hour, count]) => ({
        hour,
        count: count as number,
      })),
      topRateLimitedEndpoints: Object.entries(topRateLimitedEndpoints)
        .map(([endpoint, count]) => ({ endpoint, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  private determineStatus(statusCode: number, errorMessage?: string): ApiResponseStatus {
    if (statusCode === 429) return ApiResponseStatus.RATE_LIMITED;
    if (statusCode === 401) return ApiResponseStatus.UNAUTHORIZED;
    if (statusCode === 403) return ApiResponseStatus.FORBIDDEN;
    if (statusCode >= 400 || errorMessage) return ApiResponseStatus.ERROR;
    return ApiResponseStatus.SUCCESS;
  }

  private calculateAnalytics(usageData: ApiUsage[]): UsageAnalytics {
    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter(u => u.status === ApiResponseStatus.SUCCESS).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = usageData.reduce((sum, u) => sum + Number(u.responseTime), 0) / totalRequests;

    const requestsPerDay = this.groupBy(
      usageData,
      (usage) => usage.timestamp.toISOString().split('T')[0]
    );

    const topEndpoints = this.groupBy(usageData, 'endpoint');
    const statusCodeDistribution = this.groupBy(usageData, 'statusCode');

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      errorRate: (failedRequests / totalRequests) * 100,
      requestsPerDay: Object.entries(requestsPerDay).map(([date, count]) => ({
        date,
        count: count as number,
      })),
      topEndpoints: Object.entries(topEndpoints)
        .map(([endpoint, count]) => ({ endpoint, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      statusCodeDistribution,
    };
  }

  private groupBy<T>(array: T[], key: string | ((item: T) => string)): Record<string, number> {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      groups[groupKey] = (groups[groupKey] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private groupByWithAverage<T>(
    array: T[],
    groupKey: string,
    valueKey: string,
  ): Record<string, number> {
    const groups = array.reduce((acc, item) => {
      const key = item[groupKey];
      if (!acc[key]) {
        acc[key] = { sum: 0, count: 0 };
      }
      acc[key].sum += Number(item[valueKey]);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    return Object.entries(groups).reduce((result, [key, { sum, count }]) => {
      result[key] = sum / count;
      return result;
    }, {} as Record<string, number>);
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] || 0;
  }
}
