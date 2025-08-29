import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiUsageService } from '../services/api-usage.service';
import { ApiKey } from '../entities/api-key.entity';
import { HttpMethod } from '../entities/api-usage.entity';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly apiUsageService: ApiUsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const apiKey = request['apiKey'] as ApiKey;
    
    // Skip if no API key (public endpoints)
    if (!apiKey) {
      return next.handle();
    }

    const startTime = Date.now();
    const endpoint = request.route?.path || request.path;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          this.recordUsage(apiKey, request, response, startTime, responseData);
        },
        error: (error) => {
          this.recordUsage(apiKey, request, response, startTime, null, error);
        },
      }),
    );
  }

  private async recordUsage(
    apiKey: ApiKey,
    request: Request,
    response: Response,
    startTime: number,
    responseData?: any,
    error?: any,
  ): Promise<void> {
    try {
      const responseTime = Date.now() - startTime;
      const statusCode = error ? error.status || 500 : response.statusCode;

      const usageData = {
        endpoint: request.route?.path || request.path,
        method: request.method as HttpMethod,
        statusCode,
        responseTime,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        referer: request.headers.referer,
        requestHeaders: this.sanitizeHeaders(request.headers),
        responseHeaders: this.sanitizeHeaders(response.getHeaders()),
        queryParams: request.query,
        requestBody: this.sanitizeRequestBody(request.body),
        responseSize: this.calculateResponseSize(responseData),
        errorMessage: error?.message,
        tenantId: apiKey.tenantId,
        userId: apiKey.userId,
      };

      await this.apiUsageService.recordUsage(apiKey, usageData);
    } catch (recordingError) {
      // Log error but don't throw to avoid affecting the main request
      console.error('Failed to record API usage:', recordingError);
    }
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
    delete sanitized['set-cookie'];
    
    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    delete sanitized.authorization;
    
    return sanitized;
  }

  private calculateResponseSize(responseData: any): number {
    if (!responseData) return 0;
    
    try {
      return JSON.stringify(responseData).length;
    } catch {
      return 0;
    }
  }
}
