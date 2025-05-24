import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { StripePaymentService } from "./services/stripe-payment.service";
import { PaymentDetails } from './interfaces/payment-service.interface';

@ApiTags("Payments")
@ApiBearerAuth()
@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: StripePaymentService) {}

  @Post("process")
  @ApiOperation({
    summary: "Process payment",
    description:
      "Process a payment transaction with the provided payment details",
  })
  @ApiResponse({
    status: 200,
    description: "Payment processed successfully",
    type: Boolean,
  })
  @ApiResponse({ status: 400, description: "Invalid payment details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 402, description: "Payment processing failed" })
  async processPayment(
    @Body("amount") amount: number,
    @Body("paymentDetails") paymentDetails: PaymentDetails,
  ): Promise<boolean> {
    return this.paymentService.processPayment(amount, paymentDetails);
  }
}
