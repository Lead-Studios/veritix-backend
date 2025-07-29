import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketingController } from './controllers/ticketing.controller';
import { TicketingService } from './services/ticketing.service';
import { QrCodeService } from './services/qr-code.service';
import { TicketingEvent } from './entities/event.entity';
import { TicketingTicket } from './entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketingEvent, TicketingTicket])],
  controllers: [TicketingController],
  providers: [TicketingService, QrCodeService],
  exports: [TicketingService, QrCodeService],
})
export class TicketingModule {}
