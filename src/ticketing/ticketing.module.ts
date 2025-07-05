import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TicketingController } from "./controllers/ticketing.controller"
import { TicketingService } from "./services/ticketing.service"
import { QrCodeService } from "./services/qr-code.service"
import { Event } from "./entities/event.entity"
import { Ticket } from "./entities/ticket.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Event, Ticket])],
  controllers: [TicketingController],
  providers: [TicketingService, QrCodeService],
  exports: [TicketingService, QrCodeService],
})
export class TicketingModule {}
