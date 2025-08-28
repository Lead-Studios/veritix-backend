import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  TooManyRequestsException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { ApiUsageService } from '../services/api-usage.service';
import { ApiKey, ApiPermission } from '../entities/api-key.entity';
import { HttpMethod } from '../entities/api-usage.entity';

export const API_PERMISSIONS_KEY = 'api_permissions';
export const API_SCOPES_KEY = 'api_scopes';
export const SKIP_API_AUTH_KEY = 'skip_api_auth';

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private rateLimiterService: RateLimiterService,
    private apiUsageService: ApiUsageService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Check if API auth should be skipped
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_API_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    // Extract API key from request
    const apiKey = await this.extractAndValidateApiKey(request);
    
    // Check permissions
    await this.checkPermissions(context, apiKey);
    
    // Check scopes
    await this.checkScopes(context, apiKey, request);
    
    // Check IP whitelist
    await this.checkIpWhitelist(apiKey, request);
    
    // Check domain whitelist
    await this.checkDomainWhitelist(apiKey, request);
    
    // Check rate limits
    await this.checkRateLimits(apiKey, request, response);
    
    // Check monthly quota
    await this.checkMonthlyQuota(apiKey);

    // Attach API key to request for later use
    request['apiKey'] = apiKey;
    
    // Record usage (fire and forget)
    this.recordApiUsage(apiKey, request).catch(error => {
      console.error('Failed to record API usage:', error);
    });

    return true;
  }

  private async extractAndValidateApiKey(request: Request): Promise<ApiKey> {
    // Try different authentication methods
    let keyValue: string | undefined;

    // 1. Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      keyValue = authHeader.substring(7);
    }

    // 2. X-API-Key header
    if (!keyValue) {
      keyValue = request.headers['x-api-key'] as string;
    }

    // 3. Query parameter (less secure, for development only)
    if (!keyValue && process.env.NODE_ENV === 'development') {
      keyValue = request.query.api_key as string;
    }

    if (!keyValue) {
      throw new UnauthorizedException('API key is required');
    }

    const apiKey = await this.apiKeyService.validateApiKey(keyValue);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return apiKey;
  }

  private async checkPermissions(context: ExecutionContext, apiKey: ApiKey): Promise<void> {
    const requiredPermissions = this.reflector.getAllAndOverride<ApiPermission[]>(
      API_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return; // No specific permissions required
    }

    for (const permission of requiredPermissions) {
      const hasPermission = await this.apiKeyService.checkPermission(apiKey, permission);
      if (!hasPermission) {
        throw new ForbiddenException(`Missing required permission: ${permission}`);
      }
    }
  }

  private async checkScopes(context: ExecutionContext, apiKey: ApiKey, request: Request): Promise<void> {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      API_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const endpoint = request.route?.path || request.path;
    
    // Check endpoint-specific scopes
    const hasScope = await this.apiKeyService.checkScope(apiKey, endpoint);
    if (!hasScope) {
      throw new ForbiddenException(`API key does not have access to endpoint: ${endpoint}`);
    }

    // Check decorator-defined scopes
    if (requiredScopes && requiredScopes.length > 0) {
      for (const scope of requiredScopes) {
        const hasScopeAccess = await this.apiKeyService.checkScope(apiKey, scope);
        if (!hasScopeAccess) {
          throw new ForbiddenException(`Missing required scope: ${scope}`);
        }
      }
    }
  }

  private async checkIpWhitelist(apiKey: ApiKey, request: Request): Promise<void> {
    const clientIp = this.getClientIp(request);
    const isAllowed = await this.apiKeyService.checkIpWhitelist(apiKey, clientIp);
    
    if (!isAllowed) {
      throw new ForbiddenException(`IP address ${clientIp} is not whitelisted`);
    }
  }

  private async checkDomainWhitelist(apiKey: ApiKey, request: Request): Promise<void> {
    const referer = request.headers.referer;
    if (!referer) {
      return; // No referer check needed
    }

    try {
      const domain = new URL(referer).hostname;
      const isAllowed = await this.apiKeyService.checkDomainWhitelist(apiKey, domain);
      
      if (!isAllowed) {
        throw new ForbiddenException(`Domain ${domain} is not whitelisted`);
      }
    } catch (error) {
      // Invalid referer URL, skip domain check
    }
  }

  private async checkRateLimits(apiKey: ApiKey, request: Request, response: any): Promise<void> {
    const endpoint = request.route?.path || request.path;
    
    // Check multiple rate limit types
    const [hourlyLimit, burstLimit, globalLimit] = await Promise.all([
      this.rateLimiterService.checkRateLimit(apiKey, endpoint),
      this.rateLimiterService.getBurstLimitResult(apiKey),
      this.rateLimiterService.getGlobalRateLimit(apiKey.tenantId),
    ]);

    // Add rate limit headers
    const headers = await this.rateLimiterService.getRateLimitHeaders(apiKey, endpoint);
    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    // Check if any rate limit is exceeded
    if (!hourlyLimit.allowed) {
      response.setHeader('Retry-After', hourlyLimit.retryAfter);
      throw new TooManyRequestsException('Hourly rate limit exceeded');
    }

    if (!burstLimit.allowed) {
      response.setHeader('Retry-After', burstLimit.retryAfter);
      throw new TooManyRequestsException('Burst rate limit exceeded');
    }

    if (!globalLimit.allowed) {
      response.setHeader('Retry-After', globalLimit.retryAfter);
      throw new TooManyRequestsException('Global rate limit exceeded');
    }
  }

  private async checkMonthlyQuota(apiKey: ApiKey): Promise<void> {
    const quota = await this.rateLimiterService.checkMonthlyQuota(apiKey);
    
    if (!quota.allowed) {
      throw new TooManyRequestsException(
        `Monthly quota exceeded. Used: ${quota.used}/${quota.limit}. Resets: ${quota.resetDate.toISOString()}`
      );
    }
  }

  private async recordApiUsage(apiKey: ApiKey, request: Request): Promise<void> {
    const startTime = Date.now();
    
    // This would typically be called in an interceptor after the response
    // For now, we'll record basic request info
    const usageData = {
      endpoint: request.route?.path || request.path,
      method: request.method as HttpMethod,
      statusCode: 200, // Will be updated by interceptor
      responseTime: Date.now() - startTime,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      referer: request.headers.referer,
      requestHeaders: this.sanitizeHeaders(request.headers),
      queryParams: request.query,
      tenantId: apiKey.tenantId,
      userId: apiKey.userId,
    };

    await this.apiUsageService.recordUsage(apiKey, usageData);
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized['x-api-key'];
    delete sanitized.cookie;
    
    return sanitized;
  }
}
