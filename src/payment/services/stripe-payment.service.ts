import { Injectable } from "@nestjs/common";
import { PaymentServiceInterface } from "../interfaces/payment-service.interface";
import Stripe from "stripe";
import { config } from "dotenv";

@Injectable()
export class StripePaymentService implements PaymentServiceInterface {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Stripe API key is not defined in environment variables.",
      );
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia", // Updated to match the expected type
    });
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
