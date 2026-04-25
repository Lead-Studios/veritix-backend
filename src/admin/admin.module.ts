import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Order } from '../orders/entities/orders.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Event, Ticket, Order])],
  providers: [AdminService],
  controllers: [AdminController],
import { Order } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketType } from '../ticket-types/entities/ticket-type.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Ticket, TicketType, User])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
