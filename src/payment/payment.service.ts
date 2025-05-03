import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Stripe } from "stripe";

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
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

  async refundPayment(paymentIntentId: string) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
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
