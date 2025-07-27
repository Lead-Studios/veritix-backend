// src/checkout/checkout.module.ts
import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CheckoutSession } from "./entities/checkout-session.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CheckoutSession])],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
