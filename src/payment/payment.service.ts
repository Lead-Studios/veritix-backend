import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AuditLogType } from "../audit-log/entities/audit-log.entity";
import { ConfigService } from "@nestjs/config";
import { Stripe } from "stripe";

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
  ) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not defined in environment variables",
      );
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createPaymentIntent(amount: number, currency: string = "usd") {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
    });
  }

  async confirmPayment(paymentIntentId: string) {
    return this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  async refundPayment(paymentIntentId: string, userId?: string, adminId?: string, metadata?: any) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    
    // Log the refund action
    await this.auditLogService.create({
      type: AuditLogType.TICKET_REFUND,
      userId,
      adminId,
      description: `Refund processed for payment ${paymentIntentId}`,
      metadata: {
        paymentIntentId,
        refundId: refund.id,
        amount: refund.amount ? Number(refund.amount) : 0,
        status: refund.status,
        ...metadata
      },
    });
    
    return refund;
  }

  async processPayment(amount: number, paymentDetails: any): Promise<boolean> {
    try {
      const paymentIntent = await this.createPaymentIntent(amount);
      const confirmedPayment = await this.confirmPayment(paymentIntent.id);
      return confirmedPayment.status === "succeeded";
    } catch (error) {
      return false;
    }
  }
}
