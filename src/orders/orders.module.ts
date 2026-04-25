import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import orderConfig from './order.config';
import { OrdersScheduler } from './orders.scheduler';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TicketTypesModule } from 'src/ticket-types/ticket-types.module';
import { Order, OrderItem } from './orders.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Ticket]),
    ConfigModule.forFeature(orderConfig),
    TicketTypesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersScheduler],
  exports: [OrdersService, OrdersScheduler],
})
export class OrdersModule {}
