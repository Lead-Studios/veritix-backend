import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import orderConfig from './order.config';
import { OrdersScheduler } from './orders.scheduler';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { TicketTypesModule } from 'src/ticket-types/ticket-types.module';
import { EventsModule } from 'src/events/events.module';
import { Order, OrderItem } from './orders.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Ticket]),
    ConfigModule.forFeature(orderConfig),
    TicketTypesModule,
    EventsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersScheduler, OrdersGateway, WsJwtGuard],
  exports: [OrdersService, OrdersScheduler, OrdersGateway],
})
export class OrdersModule {}
