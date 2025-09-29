import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketQrService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { Ticket } from './ticket.entity';
import { TicketTransfer } from './ticket-transfer.entity';
import { Event } from '../modules/event/event.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketTransfer, Event, User]),
  ],
  providers: [TicketQrService, TransferService],
  controllers: [TicketController, TransferController],
  exports: [TicketQrService, TransferService],
})
export class TicketsModule {}