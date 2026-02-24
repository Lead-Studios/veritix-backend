import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketType } from './entities/ticket-type.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketTypeService } from './services/ticket-type.service';
import { TicketService } from './services/ticket.service';
import { TicketTypeController } from './controllers/ticket-type.controller';
import { TicketController } from './controllers/ticket.controller';
import { StellarModule } from '../stellar/stellar.module';
import { Order } from '../orders/orders.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketType, Ticket, Order]), StellarModule],
  controllers: [TicketTypeController, TicketController],
  providers: [TicketTypeService, TicketService],
  exports: [TicketTypeService, TicketService],
})
export class TicketsModule { }
