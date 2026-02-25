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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
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

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({ summary: 'Create a new ticket order (subscriber only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['eventId', 'items'],
      properties: {
        eventId: {
          type: 'string',
          format: 'uuid',
          example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ticketTypeId: {
                type: 'string',
                format: 'uuid',
                example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              },
              quantity: { type: 'number', example: 2 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Order created. Returns order details with Stellar payment instructions.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or insufficient ticket inventory',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – subscriber role required',
  })
  async createOrder(
    @CurrentUser() user: User,
    @Body()
    body: {
      eventId: string;
      items: { ticketTypeId: string; quantity: number }[];
    },
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
  @ApiOperation({ summary: "List the current user's orders" })
  @ApiResponse({
    status: 200,
    description: 'List of orders for the authenticated user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyOrders(@CurrentUser() user: User): Promise<Order[]> {
    return this.ordersService.findByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order by ID (owner or admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – can only view your own orders',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    const order = await this.ordersService.findById(id);

    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return order;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (owner or admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be cancelled in its current state',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – can only cancel your own orders',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    const order = await this.ordersService.findById(id);

    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    return this.ordersService.cancelOrder(id);
  }
}
