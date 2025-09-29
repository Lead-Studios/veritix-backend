import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../user/user.module';
import { TicketQrService } from './ticket-qr.service';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Ticket } from './ticket.entity';
import { User } from '../user/user.entity';
import { Event } from '../modules/event/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, User, Event]), UsersModule],
  providers: [TicketQrService, TicketService],
  controllers: [TicketController],
  exports: [TicketQrService, TicketService],
})
export class TicketsModule {}
