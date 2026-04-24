import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { OrdersService } from "./orders.service";
import { OrderStatus } from "./entities/order.entity";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("my")
  async getMyOrders(
    @Request() req,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: OrderStatus,
  ) {
    return this.ordersService.findByUser(req.user.userId, {
      page,
      limit,
      status,
    });
  }
}