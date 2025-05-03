import { Module } from '@nestjs/common';
import { StripePaymentService } from './services/stripe-payment.service';

@Module({
  providers: [StripePaymentService],
  exports: [StripePaymentService],
})
export class PaymentModule {} 