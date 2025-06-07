import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { AuditLogType } from "../../audit-log/entities/audit-log.entity";
import { PaymentServiceInterface } from "../interfaces/payment-service.interface";
import Stripe from "stripe";
import { config } from "dotenv";

@Injectable()
export class StripePaymentService implements PaymentServiceInterface {
  private stripe: Stripe;

  constructor(
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
  ) {
    const apiKey = process.env.STRIPE_API_KEY || 'some-secret-key';
    if (!apiKey) {
      throw new Error(
        "Stripe API key is not defined in environment variables.",
      );
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia", // Updated to match the expected type
    });
  }

  async refundPayment(paymentIntentId: string, userId?: string, adminId?: number, metadata?: any): Promise<any> {
    try {
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
          amount: typeof refund.amount === 'number' ? refund.amount : 0,
          status: refund.status,
          ...metadata
        },
      });
      
      return refund;
    } catch (error) {
      console.error("Refund processing error:", error);
      throw error;
    }
  }
  
  async processPayment(amount: number, paymentDetails: any): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        payment_method: paymentDetails.paymentMethodId,
        confirm: true,
      });

      return paymentIntent.status === "succeeded";
    } catch (error) {
      console.error("Payment processing error:", error);
      return false;
    }
  }
}
