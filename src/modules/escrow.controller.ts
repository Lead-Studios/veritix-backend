import { Controller, Post, Body, Param } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { EscrowService } from "./escrow.service";
import { RefundsService } from "./refunds.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ReleaseEscrowDto } from "./dto/release-escrow.dto";
import { RefundDto } from "./dto/refund.dto";

@Controller()
export class EscrowController {
  constructor(
    private ordersService: OrdersService,
    private escrowService: EscrowService,
    private refundsService: RefundsService,
  ) {}

  @Post("orders")
  async createOrder(@Body() body: CreateOrderDto) {
    // in real app extract buyerId from auth token
    const buyerId = body.buyerId;
    const order = await this.ordersService.createOrder(buyerId, body.ticketId, body.amount);
    return { success: true, order };
  }

  @Post("escrow/release")
  async release(@Body() body: ReleaseEscrowDto) {
    const res = await this.escrowService.releaseEscrow(body.orderId, body.triggeredById);
    return { success: true, ...res };
  }

  @Post("refunds")
  async refund(@Body() body: RefundDto) {
    const refund = await this.refundsService.issueRefund(body.orderId, body.organizerId, body.reason);
    return { success: true, refund };
  }
}
