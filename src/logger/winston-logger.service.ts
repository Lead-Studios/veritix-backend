import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import winston from 'winston';
import axios from 'axios';

interface ExternalLogConfig {
  enabled: boolean;
  provider?: string; // e.g., 'loki' | 'datadog' | 'generic'
  url?: string;
  token?: string;
}

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly level: string;
  private readonly external: ExternalLogConfig;

  constructor(private readonly config: ConfigService) {
    this.level = this.config.get<string>('logging.level') ?? 'info';
    this.external = {
      enabled: Boolean(this.config.get<boolean>('logging.external.enabled')),
      provider: this.config.get<string>('logging.external.provider') ?? 'generic',
      url: this.config.get<string>('logging.external.url'),
      token: this.config.get<string>('logging.external.token'),
    };

    this.logger = winston.createLogger({
      level: this.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [new winston.transports.Console({})],
    });
  }

  private async streamExternal(level: string, message: any, meta?: Record<string, any>) {
    if (!this.external.enabled || !this.external.url) return;
    try {
      const provider = this.external.provider ?? 'generic';
      if (provider === 'loki') {
        const tsNs = (BigInt(Date.now()) * BigInt(1_000_000)).toString();
        const payload = {
          streams: [
            {
              stream: { level, service: 'veritix-backend' },
              values: [[tsNs, typeof message === 'string' ? message : JSON.stringify({ message, meta })]],
            },
          ],
        };
        await axios.post(String(this.external.url), payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 2000,
        });
      } else if (provider === 'datadog') {
        const payload = {
          message: typeof message === 'string' ? message : JSON.stringify(message),
          status: level,
          service: 'veritix-backend',
          ...meta,
        };
        await axios.post(String(this.external.url), payload, {
          headers: this.external.token ? { 'DD-API-KEY': String(this.external.token) } : undefined,
          timeout: 2000,
        });
      } else {
        const payload = {
          level,
          message,
          meta: meta ?? {},
          timestamp: new Date().toISOString(),
          service: 'veritix-backend',
          provider,
        };
        await axios.post(String(this.external.url), payload, {
          headers: this.external.token ? { Authorization: `Bearer ${this.external.token}` } : undefined,
          timeout: 2000,
        });
      }
    } catch (err) {
      // Avoid recursive logging on external failures; use console logger directly
      this.logger.warn('Failed to stream external log', { error: (err as Error)?.message });
    }
  }

  log(message: any, contextOrMeta?: string | Record<string, any>) {
    const meta = typeof contextOrMeta === 'string' ? { context: contextOrMeta } : contextOrMeta;
    this.logger.info(message, meta);
    void this.streamExternal('info', message, meta);
  }

  error(message: any, traceOrMeta?: string | Record<string, any>, context?: string) {
    const meta = typeof traceOrMeta === 'object' && traceOrMeta !== null ? traceOrMeta : { context, trace: traceOrMeta };
    this.logger.error(message, meta);
    void this.streamExternal('error', message, meta);
  }

  warn(message: any, contextOrMeta?: string | Record<string, any>) {
    const meta = typeof contextOrMeta === 'string' ? { context: contextOrMeta } : contextOrMeta;
    this.logger.warn(message, meta);
    void this.streamExternal('warn', message, meta);
  }

  debug(message: any, contextOrMeta?: string | Record<string, any>) {
    const meta = typeof contextOrMeta === 'string' ? { context: contextOrMeta } : contextOrMeta;
    this.logger.debug(message, meta);
    void this.streamExternal('debug', message, meta);
  }

  verbose(message: any, contextOrMeta?: string | Record<string, any>) {
    const meta = typeof contextOrMeta === 'string' ? { context: contextOrMeta } : contextOrMeta;
    this.logger.verbose(message, meta);
    void this.streamExternal('verbose', message, meta);
  }
}