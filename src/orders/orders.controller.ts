import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderInput } from './dto/order.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { Order } from './orders.entity';

/**
 * OrdersController
 *
 * All routes require a valid JWT. The authenticated user's ID is read from
 * `req.user.id` so users can only act on their own orders.
 *
 * Route summary:
 *   POST   /orders              → createOrder
 *   GET    /orders/me           → findByUser (current user)
 *   GET    /orders/:id          → findById
 *   PATCH  /orders/:id/cancel   → cancelOrder
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Request() req: { user: { id: string } },
    @Body() body: { eventId: string; items: { ticketTypeId: string; quantity: number }[] },
  ) {
    const input: CreateOrderInput = {
      userId: req.user.id,
      eventId: body.eventId,
      items: body.items,
    };
    return this.ordersService.createOrder(input);
  }

  @Get('me')
  async findMyOrders(@Request() req: { user: { id: string } }): Promise<Order[]> {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.ordersService.findById(id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.ordersService.cancelOrder(id);
  }
}