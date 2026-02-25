import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import orderConfig from './order.config';
import { OrdersService } from './orders.service';
import { OrdersScheduler } from './orders.scheduler';
import { TicketModule } from 'src/ticket-verification/ticket.module';
import { Order } from './orders.entity';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    ConfigModule.forFeature(orderConfig),
    TicketModule,
    StellarModule,
  ],
  providers: [OrdersService, OrdersScheduler],
  exports: [OrdersService, OrdersScheduler],
})
export class OrdersModule {}
