import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonLoggerService } from './winston-logger.service.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: WinstonLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const durationMs = Number(
        (process.hrtime.bigint() - start) / BigInt(1_000_000),
      );
      const { statusCode } = res;
      const meta = {
        method,
        url: originalUrl,
        statusCode,
        durationMs,
      };
      if (statusCode >= 500) {
        this.logger.error('HTTP Request', undefined, JSON.stringify(meta));
      } else if (statusCode >= 400) {
        this.logger.warn('HTTP Request', JSON.stringify(meta));
      } else {
        this.logger.log('HTTP Request', JSON.stringify(meta));
      }
    });

    next();
  }
}
