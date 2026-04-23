import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import orderConfig from './order.config';
import { OrdersScheduler } from './orders.scheduler';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TicketModule } from 'src/ticket-verification/ticket.module';
import { TicketsModule } from 'src/tickets-inventory/tickets.module';
import { Order, OrderItem } from './orders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ConfigModule.forFeature(orderConfig),
    TicketModule,
    TicketsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersScheduler],
  exports: [OrdersService, OrdersScheduler],
})
export class OrdersModule {}