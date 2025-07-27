// src/checkout/checkout.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CheckoutService } from "./checkout.service";
import { StartCheckoutDto } from "./dto/start-checkout.dto";

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post("start")
  async start(@Body() dto: StartCheckoutDto) {
    return this.checkoutService.startCheckout(dto);
  }

  @Patch("complete/:sessionId")
  async complete(@Param("sessionId") sessionId: string) {
    return this.checkoutService.completeCheckout(sessionId);
  }

  @Get("dropoff-stats")
  async stats() {
    return this.checkoutService.getDropoffRate();
  }
}
