import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentService } from "./payment.service";

@Module({
  imports: [ConfigModule],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class StripeModule {}
