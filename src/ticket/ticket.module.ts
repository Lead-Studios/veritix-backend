import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { PdfService } from './pdf/pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketHistory])],
  providers: [TicketService, PdfService],
  controllers: [TicketController],
})
export class TicketModule {} 