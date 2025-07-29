import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AnalyticsEventService } from '../analytics-event.service';

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
  constructor(private readonly analyticsService: AnalyticsEventService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: import('express').Request & {
      user?: { id?: string };
      sessionID?: string;
    } = context.switchToHttp().getRequest();
    const eventId = request.params.id;

    // Track event view if this is a GET request to an event endpoint
    if (
      request.method === 'GET' &&
      eventId &&
      request.url.includes('/events/')
    ) {
      void this.trackEventView(request, eventId);
    }

    return next.handle();
  }

  private async trackEventView(
    request: import('express').Request & {
      user?: { id?: string };
      sessionID?: string;
    },
    eventId: string,
  ) {
    try {
      const getString = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value;
        if (Array.isArray(value) && typeof value[0] === 'string')
          return value[0];
        return undefined;
      };

      const trackingData = {
        userId: request.user?.id,
        sessionId: request.sessionID,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        trafficSource: this.determineTrafficSource(request),
        referrerUrl: request.headers.referer,
        utm_source: getString(request.query.utm_source),
        utm_medium: getString(request.query.utm_medium),
        utm_campaign: getString(request.query.utm_campaign),
      };

      await this.analyticsService.trackEventView(eventId, trackingData);
    } catch (error) {
      console.error('Error tracking event view:', error);
    }
  }

  private determineTrafficSource(
    request: import('express').Request & {
      user?: { id?: string };
      sessionID?: string;
    },
  ): string {
    const utm_source =
      typeof request.query?.utm_source === 'string'
        ? request.query.utm_source
        : Array.isArray(request.query?.utm_source)
          ? request.query.utm_source[0]
          : undefined;
    const referer = request.headers.referer;

    if (typeof utm_source === 'string' && utm_source) {
      return utm_source;
    }

    if (referer) {
      const referrerDomain = new URL(referer).hostname;

      if (referrerDomain.includes('google')) return 'google';
      if (referrerDomain.includes('facebook')) return 'facebook';
      if (referrerDomain.includes('twitter')) return 'twitter';
      if (referrerDomain.includes('instagram')) return 'instagram';
      if (referrerDomain.includes('linkedin')) return 'linkedin';

      return 'referral';
    }

    return 'direct';
  }
}
