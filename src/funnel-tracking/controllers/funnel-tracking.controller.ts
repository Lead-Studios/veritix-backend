import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FunnelTrackingService } from '../services/funnel-tracking.service';
import { TrackFunnelActionDto } from '../dto/track-funnel-action.dto';
import { FunnelStatsResponseDto } from '../dto/funnel-stats.dto';
import { FunnelStage, FunnelActionType } from '../entities/funnel-action.entity';

@ApiTags('Funnel Tracking')
@Controller('funnel-tracking')
export class FunnelTrackingController {
  constructor(private readonly funnelTrackingService: FunnelTrackingService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track a funnel action' })
  @ApiResponse({ status: 201, description: 'Action tracked successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async trackAction(
    @Body(ValidationPipe) trackActionDto: TrackFunnelActionDto,
    @Request() req: any,
  ) {
    // Extract additional data from request
    const enhancedDto = {
      ...trackActionDto,
      ipAddress: trackActionDto.ipAddress || req.ip,
      userAgent: trackActionDto.userAgent || req.headers['user-agent'],
      referrerUrl: trackActionDto.referrerUrl || req.headers.referer,
    };

    const action = await this.funnelTrackingService.trackAction(enhancedDto);

    return {
      success: true,
      message: 'Action tracked successfully',
      actionId: action.id,
    };
  }

  @Post('session/start')
  @ApiOperation({ summary: 'Start a new funnel session' })
  @ApiResponse({ status: 201, description: 'Session started successfully' })
  async startSession(
    @Body() body: { eventId: string; userId?: string },
    @Request() req: any,
  ) {
    const sessionData = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrerUrl: req.headers.referer,
      trafficSource: this.determineTrafficSource(req),
      utmSource: req.query.utm_source,
      utmMedium: req.query.utm_medium,
      utmCampaign: req.query.utm_campaign,
      utmTerm: req.query.utm_term,
      utmContent: req.query.utm_content,
    };

    const session = await this.funnelTrackingService.getOrCreateSession(
      body.eventId,
      body.userId,
      sessionData,
    );

    return {
      success: true,
      message: 'Session started successfully',
      sessionId: session.id,
    };
  }

  @Post('session/:sessionId/complete')
  @ApiOperation({ summary: 'Complete a funnel session' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  async completeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { purchaseId?: string; totalSpent?: number },
  ) {
    await this.funnelTrackingService.completeSession(
      sessionId,
      body.purchaseId,
      body.totalSpent,
    );

    return {
      success: true,
      message: 'Session completed successfully',
    };
  }

  @Post('session/:sessionId/abandon')
  @ApiOperation({ summary: 'Abandon a funnel session' })
  @ApiResponse({ status: 200, description: 'Session abandoned successfully' })
  async abandonSession(@Param('sessionId') sessionId: string) {
    await this.funnelTrackingService.abandonSession(sessionId);

    return {
      success: true,
      message: 'Session abandoned successfully',
    };
  }

  @Get('stats/:eventId')
  @ApiOperation({ summary: 'Get funnel statistics for an event' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: FunnelStatsResponseDto })
  async getFunnelStats(
    @Param('eventId') eventId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.funnelTrackingService.getFunnelStats(eventId, start, end);
  }

  @Post('track/event-view')
  @ApiOperation({ summary: 'Track event view (convenience endpoint)' })
  @ApiResponse({ status: 201, description: 'Event view tracked successfully' })
  async trackEventView(
    @Body() body: { eventId: string; sessionId: string; userId?: string },
    @Request() req: any,
  ) {
    const trackActionDto: TrackFunnelActionDto = {
      eventId: body.eventId,
      sessionId: body.sessionId,
      userId: body.userId,
      stage: FunnelStage.EVENT_VIEW,
      actionType: FunnelActionType.VIEW,
      actionName: 'view_event_page',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrerUrl: req.headers.referer,
      trafficSource: this.determineTrafficSource(req),
    };

    const action = await this.funnelTrackingService.trackAction(trackActionDto);

    return {
      success: true,
      message: 'Event view tracked successfully',
      actionId: action.id,
    };
  }

  @Post('track/ticket-selection')
  @ApiOperation({ summary: 'Track ticket selection (convenience endpoint)' })
  @ApiResponse({ status: 201, description: 'Ticket selection tracked successfully' })
  async trackTicketSelection(
    @Body() body: {
      eventId: string;
      sessionId: string;
      userId?: string;
      ticketTier?: string;
      price?: number;
    },
    @Request() req: any,
  ) {
    const trackActionDto: TrackFunnelActionDto = {
      eventId: body.eventId,
      sessionId: body.sessionId,
      userId: body.userId,
      stage: FunnelStage.TICKET_SELECTION,
      actionType: FunnelActionType.CLICK,
      actionName: 'select_ticket_tier',
      metadata: {
        ticketTier: body.ticketTier,
        price: body.price,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const action = await this.funnelTrackingService.trackAction(trackActionDto);

    return {
      success: true,
      message: 'Ticket selection tracked successfully',
      actionId: action.id,
    };
  }

  @Post('track/cart-add')
  @ApiOperation({ summary: 'Track cart addition (convenience endpoint)' })
  @ApiResponse({ status: 201, description: 'Cart addition tracked successfully' })
  async trackCartAdd(
    @Body() body: {
      eventId: string;
      sessionId: string;
      userId?: string;
      quantity?: number;
      totalPrice?: number;
    },
    @Request() req: any,
  ) {
    const trackActionDto: TrackFunnelActionDto = {
      eventId: body.eventId,
      sessionId: body.sessionId,
      userId: body.userId,
      stage: FunnelStage.CART_ADD,
      actionType: FunnelActionType.CLICK,
      actionName: 'add_to_cart',
      metadata: {
        quantity: body.quantity,
        totalPrice: body.totalPrice,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const action = await this.funnelTrackingService.trackAction(trackActionDto);

    return {
      success: true,
      message: 'Cart addition tracked successfully',
      actionId: action.id,
    };
  }

  @Post('track/checkout-start')
  @ApiOperation({ summary: 'Track checkout start (convenience endpoint)' })
  @ApiResponse({ status: 201, description: 'Checkout start tracked successfully' })
  async trackCheckoutStart(
    @Body() body: { eventId: string; sessionId: string; userId?: string },
    @Request() req: any,
  ) {
    const trackActionDto: TrackFunnelActionDto = {
      eventId: body.eventId,
      sessionId: body.sessionId,
      userId: body.userId,
      stage: FunnelStage.CHECKOUT_START,
      actionType: FunnelActionType.CLICK,
      actionName: 'start_checkout',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const action = await this.funnelTrackingService.trackAction(trackActionDto);

    return {
      success: true,
      message: 'Checkout start tracked successfully',
      actionId: action.id,
    };
  }

  @Post('track/payment-complete')
  @ApiOperation({ summary: 'Track payment completion (convenience endpoint)' })
  @ApiResponse({ status: 201, description: 'Payment completion tracked successfully' })
  async trackPaymentComplete(
    @Body() body: {
      eventId: string;
      sessionId: string;
      userId?: string;
      purchaseId?: string;
      totalSpent?: number;
    },
    @Request() req: any,
  ) {
    const trackActionDto: TrackFunnelActionDto = {
      eventId: body.eventId,
      sessionId: body.sessionId,
      userId: body.userId,
      stage: FunnelStage.PAYMENT_COMPLETE,
      actionType: FunnelActionType.FORM_COMPLETE,
      actionName: 'payment_complete',
      metadata: {
        purchaseId: body.purchaseId,
        totalSpent: body.totalSpent,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const action = await this.funnelTrackingService.trackAction(trackActionDto);

    // Complete the session
    await this.funnelTrackingService.completeSession(
      body.sessionId,
      body.purchaseId,
      body.totalSpent,
    );

    return {
      success: true,
      message: 'Payment completion tracked successfully',
      actionId: action.id,
    };
  }

  /**
   * Determine traffic source from request
   */
  private determineTrafficSource(req: any): string {
    const utmSource = req.query.utm_source;
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