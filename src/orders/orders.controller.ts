import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { CreateOrderInput } from './dto/order.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { CurrentUser } from 'src/auth/decorators/current.user.decorators';
import { UserRole } from 'src/auth/common/enum/user-role-enum';
import { User } from 'src/auth/entities/user.entity';
import { Order } from './orders.entity';
import { StellarConfig } from 'src/stellar/stellar.config';

/**
 * OrdersController
 *
 * All routes require a valid JWT. The authenticated user's ID is read from
 * the CurrentUser decorator so users can only act on their own orders.
 *
 * Route summary:
 *   POST   /orders       → createOrder (SUBSCRIBER role required)
 *   GET    /orders/my    → findMyOrders (current user)
 *   GET    /orders/:id   → findById (owner or ADMIN only)
 *   DELETE /orders/:id   → cancelOrder (owner or ADMIN only)
 */
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles(UserRole.SUBSCRIBER)
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser() user: User,
    @Body() body: { eventId: string; items: { ticketTypeId: string; quantity: number }[] },
  ) {
    const input: CreateOrderInput = {
      userId: user.id,
      eventId: body.eventId,
      items: body.items,
    };
    const result = await this.ordersService.createOrder(input);
    
    const stellarConfig = this.configService.get<StellarConfig>('stellar');
    
    return {
      ...result.order,
      destinationAddress: stellarConfig?.platformAddress,
      memo: result.stellarMemo,
      amountXLM: result.order.totalAmountXLM,
    };
  }

  @Get('my')
  async findMyOrders(@CurrentUser() user: User): Promise<Order[]> {
    return this.ordersService.findByUser(user.id);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    const order = await this.ordersService.findById(id);
    
    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view this order');
    }
    
    return order;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    const order = await this.ordersService.findById(id);
    
    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }
    
    return this.ordersService.cancelOrder(id);
  }
}