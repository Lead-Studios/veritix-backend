import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../event/entities/event.entity';
import { User } from '../user/entities/user.entity';
import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Event, User])],
  providers: [TicketService],
  controllers: [TicketController],
})
export class TicketModule {} 