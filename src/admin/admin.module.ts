import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets-inventory/entities/ticket.entity';
import { Order } from '../orders/orders.entity';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Event, Ticket, Order])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
