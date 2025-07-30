import { Injectable } from '@nestjs/common';
import { FunnelTrackingService } from '../services/funnel-tracking.service';
import {
  FunnelStage,
  FunnelActionType,
} from '../entities/funnel-action.entity';

/**
 * Example integration showing how to integrate funnel tracking
 * with existing ticket purchase flows
 */
@Injectable()
export class TicketPurchaseIntegrationExample {
  constructor(private readonly funnelTrackingService: FunnelTrackingService) {}

  /**
   * Example: Integrate with existing ticket purchase service
   */
  async purchaseTicketsWithTracking(
    eventId: string,
    userId: string,
    purchaseData: {
      ticketQuantity: number;
      totalPrice: number;
      ticketTier: string;
    },
  ) {
    // 1. Start or get existing session
    const session = await this.funnelTrackingService.getOrCreateSession(
      eventId,
      userId,
    );

    // 2. Track ticket selection
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId: session.id,
      userId,
      stage: FunnelStage.TICKET_SELECTION,
      actionType: FunnelActionType.CLICK,
      actionName: 'select_ticket_tier',
      metadata: {
        ticketTier: purchaseData.ticketTier,
        price: purchaseData.totalPrice / purchaseData.ticketQuantity,
      },
    });

    // 3. Track cart addition
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId: session.id,
      userId,
      stage: FunnelStage.CART_ADD,
      actionType: FunnelActionType.CLICK,
      actionName: 'add_to_cart',
      metadata: {
        quantity: purchaseData.ticketQuantity,
        totalPrice: purchaseData.totalPrice,
      },
    });

    // 4. Track checkout start
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId: session.id,
      userId,
      stage: FunnelStage.CHECKOUT_START,
      actionType: FunnelActionType.FORM_START,
      actionName: 'start_checkout',
    });

    // 5. Simulate ticket purchase (existing logic)
    const purchaseResult = await this.processTicketPurchase(purchaseData);

    // 6. Track payment completion
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId: session.id,
      userId,
      stage: FunnelStage.PAYMENT_COMPLETE,
      actionType: FunnelActionType.FORM_COMPLETE,
      actionName: 'payment_complete',
      metadata: {
        purchaseId: purchaseResult.purchaseId,
        totalSpent: purchaseData.totalPrice,
      },
    });

    // 7. Complete the session
    await this.funnelTrackingService.completeSession(
      session.id,
      purchaseResult.purchaseId,
      purchaseData.totalPrice,
    );

    return purchaseResult;
  }

  /**
   * Example: Integrate with existing event view tracking
   */
  async trackEventViewWithFunnel(
    eventId: string,
    userId: string,
    viewData: {
      ipAddress?: string;
      userAgent?: string;
      referrerUrl?: string;
      timeOnPage?: number;
    },
  ) {
    // 1. Start or get existing session
    const session = await this.funnelTrackingService.getOrCreateSession(
      eventId,
      userId,
      {
        ipAddress: viewData.ipAddress,
        userAgent: viewData.userAgent,
        referrerUrl: viewData.referrerUrl,
      },
    );

    // 2. Track event view
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId: session.id,
      userId,
      stage: FunnelStage.EVENT_VIEW,
      actionType: FunnelActionType.VIEW,
      actionName: 'view_event_page',
      ipAddress: viewData.ipAddress,
      userAgent: viewData.userAgent,
      referrerUrl: viewData.referrerUrl,
      timeOnPage: viewData.timeOnPage,
    });

    return session;
  }

  /**
   * Example: Handle abandoned sessions
   */
  async handleSessionAbandonment(sessionId: string, reason?: string) {
    // Track abandonment action
    await this.funnelTrackingService.trackAction({
      eventId: 'event-id', // Would be extracted from session
      sessionId,
      stage: FunnelStage.CHECKOUT_START, // Last stage before abandonment
      actionType: FunnelActionType.ABANDON,
      actionName: 'session_abandoned',
      metadata: {
        reason: reason || 'user_left',
        abandonedAt: new Date(),
      },
    });

    // Mark session as abandoned
    await this.funnelTrackingService.abandonSession(sessionId);
  }

  /**
   * Example: Get funnel insights for optimization
   */
  async getFunnelInsights(eventId: string) {
    const stats = await this.funnelTrackingService.getFunnelStats(eventId);

    // Analyze drop-off points
    const dropoffAnalysis = stats.stages.map((stage, index) => {
      const nextStage = stats.stages[index + 1];
      const dropoffRate = nextStage
        ? ((stage.totalSessions - nextStage.totalSessions) /
            stage.totalSessions) *
          100
        : 0;

      return {
        stage: stage.stage,
        dropoffRate,
        totalSessions: stage.totalSessions,
        avgTimeSpent: stage.avgTimeSpent,
      };
    });

    // Identify optimization opportunities
    const optimizationOpportunities = dropoffAnalysis
      .filter((analysis) => analysis.dropoffRate > 50)
      .map((analysis) => ({
        stage: analysis.stage,
        issue: `High drop-off rate: ${analysis.dropoffRate.toFixed(1)}%`,
        recommendation: this.getOptimizationRecommendation(analysis.stage),
      }));

    return {
      overallConversionRate: stats.overallConversionRate,
      totalRevenue: stats.totalRevenue,
      dropoffAnalysis,
      optimizationOpportunities,
      topTrafficSources: stats.summary.topTrafficSources,
      topCountries: stats.summary.topCountries,
    };
  }

  /**
   * Example: A/B testing integration
   */
  async trackABTestVariant(
    eventId: string,
    sessionId: string,
    userId: string,
    variant: string,
    stage: FunnelStage,
  ) {
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId,
      userId,
      stage,
      actionType: FunnelActionType.VIEW,
      actionName: 'ab_test_variant_viewed',
      metadata: {
        variant,
        testName: 'checkout_optimization',
        timestamp: new Date(),
      },
    });
  }

  /**
   * Example: Error tracking
   */
  async trackFunnelError(
    eventId: string,
    sessionId: string,
    userId: string,
    error: {
      stage: FunnelStage;
      errorType: string;
      errorMessage: string;
      userAction?: string;
    },
  ) {
    await this.funnelTrackingService.trackAction({
      eventId,
      sessionId,
      userId,
      stage: error.stage,
      actionType: FunnelActionType.ERROR,
      actionName: 'funnel_error',
      errorMessage: error.errorMessage,
      metadata: {
        errorType: error.errorType,
        userAction: error.userAction,
        timestamp: new Date(),
      },
    });
  }

  // Helper methods
  private async processTicketPurchase(purchaseData: any) {
    // Simulate existing ticket purchase logic
    return {
      purchaseId: `purchase-${Date.now()}`,
      success: true,
      message: 'Purchase completed successfully',
    };
  }

  private getOptimizationRecommendation(stage: FunnelStage): string {
    const recommendations = {
      [FunnelStage.EVENT_VIEW]: 'Improve event page design and content',
      [FunnelStage.TICKET_SELECTION]: 'Simplify ticket selection process',
      [FunnelStage.CART_ADD]: 'Make add-to-cart more prominent',
      [FunnelStage.CHECKOUT_START]: 'Streamline checkout process',
      [FunnelStage.PAYMENT_INFO]: 'Simplify payment form',
      [FunnelStage.PAYMENT_COMPLETE]: 'Improve payment processing',
      [FunnelStage.PURCHASE_COMPLETE]: 'Enhance post-purchase experience',
    };

    return recommendations[stage] || 'Analyze user behavior at this stage';
  }
}

/**
 * Example: Frontend integration code
 */
export class FrontendIntegrationExample {
  private sessionId: string | null = null;

  async startFunnelSession(eventId: string, userId?: string) {
    const response = await fetch('/funnel-tracking/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, userId }),
    });

    const { sessionId } = await response.json();
    this.sessionId = sessionId;
    return sessionId;
  }

  async trackEventView(eventId: string, userId?: string) {
    if (!this.sessionId) {
      await this.startFunnelSession(eventId, userId);
    }

    await fetch('/funnel-tracking/track/event-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: this.sessionId,
        userId,
      }),
    });
  }

  async trackTicketSelection(eventId: string, ticketData: any) {
    await fetch('/funnel-tracking/track/ticket-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: this.sessionId,
        ...ticketData,
      }),
    });
  }

  async trackPurchaseCompletion(eventId: string, purchaseData: any) {
    await fetch('/funnel-tracking/track/payment-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: this.sessionId,
        ...purchaseData,
      }),
    });
  }
}
