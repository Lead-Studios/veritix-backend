import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentStrategy, PaymentRequest, PaymentResponse, VerificationResponse } from '../interfaces/payment-strategy.interface';

@Injectable()
export class StripePaymentStrategy implements PaymentStrategy 
{
  private stripe: Stripe;

  constructor(private configService: ConfigService)
   {
     this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), 
     {
      apiVersion: '2023-10-16',
     });
    }

  getProviderName(): string {
    return 'stripe';
  }

  async verifyPayment(transactionId: string): Promise<VerificationResponse> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(transactionId);
      const paymentStatus = session.payment_status === 'paid';
      return {
        success: paymentStatus,
        transactionId: session.id,
        reference: session.client_reference_id || '',
        status: paymentStatus ? 'success' : 'pending',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency ? session.currency.toUpperCase() : '',
        // message: paymentStatus ? 'Payment verified successfully' : 'Payment not completed',
        metadata: { session },
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        reference: '',
        status: 'failed',
        amount: 0,
        currency: '',
        // message: `Stripe verification error: ${error.message}`,
      };
    }
  }

  async initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: 'Payment',
              },
              unit_amount: request.amount * 100, // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.callback_url || `${this.configService.get('APP_URL')}/payment/success`,
        cancel_url: `${this.configService.get('APP_URL')}/payment/cancel`,
        client_reference_id: request.reference,
        customer_email: request.email,
        metadata: request.metadata || {},
      });

      return {
        success: true,
        transactionId: session.id,
        paymentUrl: session.url ?? undefined,
        reference: request.reference,
        message: 'Payment session created successfully',
        metadata: { sessionId: session.id },
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        reference: request.reference,
        message: `Stripe error: ${error.message}`,
      };
    }
}

}
