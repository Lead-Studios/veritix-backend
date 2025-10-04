import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { AbuseLogService } from 'src/abuse-log/abuse-log.service';
import type { Request } from 'express';

@Injectable()
export class LoggingThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly abuseLogService: AbuseLogService,
  ) {
    super(options, storageService, reflector);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: import('@nestjs/throttler').ThrottlerLimitDetail
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || 'unknown';
    const endpoint = request.url;

    // log into DB
    await this.abuseLogService.log(endpoint, ip, 'Rate limit exceeded');

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}