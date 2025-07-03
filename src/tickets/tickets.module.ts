import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PaymentService } from './payment.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, PaymentService],
  exports: [TicketsService],
})
export class TicketsModule {} 