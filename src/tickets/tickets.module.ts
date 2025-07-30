import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PaymentService } from './payment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketingTicket } from '../ticketing/entities/ticket.entity';
import { TicketingEvent } from '../ticketing/entities/event.entity';
import { InsuranceService } from './services/insurance.service';
import { NftTicketsModule } from '../nft-tickets/nft-tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketingTicket, TicketingEvent]),
    NftTicketsModule, // Import NftTicketsModule as TicketsService depends on NftTicketsService
  ],
  controllers: [TicketsController],
  providers: [TicketsService, PaymentService, InsuranceService],
  exports: [TicketsService],
})
export class TicketsModule {} 