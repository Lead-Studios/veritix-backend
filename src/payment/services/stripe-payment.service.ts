import { Injectable } from '@nestjs/common';
import { PaymentServiceInterface } from '../interfaces/payment-service.interface';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentService implements PaymentServiceInterface {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: null,
    });
  }

  async processPayment(amount: number, paymentDetails: any): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        payment_method: paymentDetails.paymentMethodId,
        confirm: true,
      });

      return paymentIntent.status === 'succeeded';
    } catch (error) {
      console.error('Payment processing error:', error);
      return false;
    }
  }
}