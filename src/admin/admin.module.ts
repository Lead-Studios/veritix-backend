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
})
export class AdminModule {}
