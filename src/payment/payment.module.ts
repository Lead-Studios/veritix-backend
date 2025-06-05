import { Module, forwardRef } from '@nestjs/common';
import { StripePaymentService } from './services/stripe-payment.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [forwardRef(() => AuditLogModule)],
  providers: [StripePaymentService],
  exports: [StripePaymentService],
})
export class PaymentModule {} 