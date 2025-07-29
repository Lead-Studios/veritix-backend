import {
  Injectable,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(@Optional() stripeInstance?: Stripe) {
    this.stripe =
      stripeInstance ||
      new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2025-06-30.basil',
      });
  }

  async processPayment(paymentToken: string, amount: number): Promise<string> {
    try {
      // Stripe expects amount in the smallest currency unit (e.g., cents)
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
        payment_method: paymentToken,
        confirm: true,
      });
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not successful');
      }
      return paymentIntent.id;
    } catch (error: any) {
      console.error('Stripe error:', error);
      throw new InternalServerErrorException(
        'Payment failed: ' + (error.message || 'Unknown error'),
      );
    }
  }
}
