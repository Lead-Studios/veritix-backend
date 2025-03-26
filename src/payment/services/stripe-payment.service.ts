import { Injectable } from '@nestjs/common';
import { PaymentServiceInterface } from '../interfaces/payment-service.interface';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentService implements PaymentServiceInterface {
  private stripe: Stripe;

  // constructor() {
  //   const stripeKey = process.env.STRIPE_SECRET_KEY;
  //   if (!stripeKey) {
  //     throw new Error('Stripe secret key is missing');
  //   }

  //   this.stripe = new Stripe(stripeKey, {
  //     apiVersion: null,
  //   });
  // }
  constructor() {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        console.warn('⚠️ Stripe secret key is missing — skipping Stripe setup.');
        return; // Skip initialization
      }
  
      this.stripe = new Stripe(stripeKey, {
        apiVersion: null,
      });
    } catch (error) {
      console.warn('⚠️ Stripe setup failed — skipping Stripe:', error.message);
    }
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
