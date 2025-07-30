import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FunnelTrackingService } from '../services/funnel-tracking.service';
import {
  FunnelStage,
  FunnelActionType,
} from '../entities/funnel-action.entity';

@Injectable()
export class FunnelTrackingMiddleware implements NestMiddleware {
  constructor(private readonly funnelTrackingService: FunnelTrackingService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Store original end method to intercept response
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override end method to track completion
    res.end = function (chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const timeOnPage = Math.floor((endTime - startTime) / 1000); // Convert to seconds

      // Call original end method
      originalEnd.call(this, chunk, encoding);

      // Track funnel action asynchronously (don't block response)
      this.trackFunnelAction(req, res, timeOnPage).catch((error) => {
        console.error('Error tracking funnel action:', error);
      });
    }.bind(this);

    next();
  }

  private async trackFunnelAction(
    req: Request,
    res: Response,
    timeOnPage: number,
  ) {
    try {
      const { method, url, params, body, query, headers } = req;
      const eventId = params?.eventId || body?.eventId || query?.eventId;
      const sessionId = body?.sessionId || query?.sessionId;
      const userId = (req as any).user?.id || body?.userId || query?.userId;

      if (!eventId || !sessionId) {
        return; // Skip tracking if no event or session
      }

      // Determine funnel stage based on URL and method
      const stage = this.determineFunnelStage(method, url, body);
      const actionType = this.determineActionType(method, res.statusCode);

      if (!stage || !actionType) {
        return; // Skip if we can't determine stage or action type
      }

      const trackActionDto = {
        eventId,
        sessionId,
        userId,
        stage,
        actionType,
        actionName: this.generateActionName(method, url, body),
        metadata: this.extractMetadata(body, params, query),
        ipAddress: req.ip,
        userAgent: headers['user-agent'],
        referrerUrl: headers.referer,
        trafficSource: this.determineTrafficSource(req),
        utmSource: query.utm_source as string,
        utmMedium: query.utm_medium as string,
        utmCampaign: query.utm_campaign as string,
        utmTerm: query.utm_term as string,
        utmContent: query.utm_content as string,
        timeOnPage,
        errorMessage:
          res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
      };

      await this.funnelTrackingService.trackAction(trackActionDto);
    } catch (error) {
      console.error('Error in funnel tracking middleware:', error);
    }
  }

  private determineFunnelStage(
    method: string,
    url: string,
    body: any,
  ): FunnelStage | null {
    const urlLower = url.toLowerCase();

    // Event view
    if (
      method === 'GET' &&
      urlLower.includes('/events/') &&
      !urlLower.includes('/tickets')
    ) {
      return FunnelStage.EVENT_VIEW;
    }

    // Ticket selection
    if (
      method === 'GET' &&
      urlLower.includes('/tickets') &&
      !urlLower.includes('/purchase')
    ) {
      return FunnelStage.TICKET_SELECTION;
    }

    // Cart operations
    if (method === 'POST' && urlLower.includes('/cart')) {
      return FunnelStage.CART_ADD;
    }

    // Checkout start
    if (
      method === 'POST' &&
      (urlLower.includes('/checkout') || urlLower.includes('/purchase'))
    ) {
      return FunnelStage.CHECKOUT_START;
    }

    // Payment info
    if (method === 'POST' && urlLower.includes('/payment')) {
      return FunnelStage.PAYMENT_INFO;
    }

    // Payment complete
    if (
      (method === 'POST' && urlLower.includes('/complete')) ||
      urlLower.includes('/confirm')
    ) {
      return FunnelStage.PAYMENT_COMPLETE;
    }

    return null;
  }

  private determineActionType(
    method: string,
    statusCode: number,
  ): FunnelActionType | null {
    if (statusCode >= 400) {
      return FunnelActionType.ERROR;
    }

    switch (method) {
      case 'GET':
        return FunnelActionType.VIEW;
      case 'POST':
        return FunnelActionType.FORM_COMPLETE;
      case 'PUT':
      case 'PATCH':
        return FunnelActionType.CLICK;
      default:
        return null;
    }
  }

  private generateActionName(method: string, url: string, body: any): string {
    const urlParts = url.split('/').filter(Boolean);
    const lastPart = urlParts[urlParts.length - 1];

    switch (method) {
      case 'GET':
        return `view_${lastPart}`;
      case 'POST':
        return `submit_${lastPart}`;
      case 'PUT':
      case 'PATCH':
        return `update_${lastPart}`;
      default:
        return `action_${lastPart}`;
    }
  }

  private extractMetadata(
    body: any,
    params: any,
    query: any,
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract relevant data from body
    if (body) {
      if (body.quantity) metadata.quantity = body.quantity;
      if (body.totalPrice) metadata.totalPrice = body.totalPrice;
      if (body.ticketTier) metadata.ticketTier = body.ticketTier;
      if (body.paymentMethod) metadata.paymentMethod = body.paymentMethod;
    }

    // Extract from params
    if (params) {
      if (params.eventId) metadata.eventId = params.eventId;
      if (params.ticketId) metadata.ticketId = params.ticketId;
    }

    // Extract from query
    if (query) {
      if (query.utm_source) metadata.utmSource = query.utm_source;
      if (query.utm_medium) metadata.utmMedium = query.utm_medium;
      if (query.utm_campaign) metadata.utmCampaign = query.utm_campaign;
    }

    return metadata;
  }

  private determineTrafficSource(req: Request): string {
    const utmSource = req.query.utm_source as string;
    const referer = req.headers.referer;

    if (utmSource) {
      return utmSource;
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
