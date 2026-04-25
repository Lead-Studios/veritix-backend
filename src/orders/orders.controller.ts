import {
  Body,
  Controller,
  Delete,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Order } from './orders.entity';

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
    @Body() body: CreateOrderDto,
  ) {
    const result = await this.ordersService.create(body, user);
    const destinationAddress = this.configService.get<string>('STELLAR_PLATFORM_ADDRESS');

    return {
      ...result.order,
      destinationAddress,
      memo: result.stellarMemo,
      amountXLM: result.amountXLM,
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
    return this.ordersService.findById(id, user);
  }

  @Get(':id/tickets')
  async getTickets(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderTickets(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.ordersService.cancel(id, user);
  }
}
