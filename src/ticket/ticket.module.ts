import { Module } from '@nestjs/common';
import { TicketQrService } from './ticket.service.js';
import { TicketController } from './ticket.controller.js';

@Module({
  providers: [TicketQrService],
  controllers: [TicketController],
  exports: [TicketQrService],
})
export class TicketsModule {}