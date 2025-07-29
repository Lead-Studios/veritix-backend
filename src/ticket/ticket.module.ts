import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ticket } from './entities/ticket.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../user/entities/user.entity';
import { PromoCode } from './entities/promo-code.entity';

import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';
import { PdfService } from './pdf/pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketHistory, Event, User, PromoCode]),
  ],
  providers: [TicketService, PdfService],
  controllers: [TicketController],
})
export class TicketModule {}
