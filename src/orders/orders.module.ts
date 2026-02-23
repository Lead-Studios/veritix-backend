import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import orderConfig from './order.config';
import { OrdersScheduler } from './orders.scheduler';
import { TicketModule } from 'src/ticket-verification/ticket.module';
import { Order, OrderItem } from './orders.entity';

/**
 * OrdersModule
 *
 * Registers `OrdersScheduler` as a provider so @nestjs/schedule picks up
 * its @Cron decorators automatically once ScheduleModule.forRoot() is in
 * AppModule.
 *
 * AppModule wiring required:
 * ```ts
 * @Module({
 *   imports: [
 *     ScheduleModule.forRoot(),   // ← must be present exactly once
 *     ConfigModule.forRoot({ load: [orderConfig], isGlobal: true }),
 *     OrdersModule,
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ConfigModule.forFeature(orderConfig),
    TicketModule,
  ],
  providers: [OrdersScheduler],
  exports: [OrdersScheduler],
})
export class OrdersModule {}