import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { RefundController, TicketRefundController } from "./controllers/refund.controller"
import { RefundService } from "./services/refund.service"
import { Refund } from "./entities/refund.entity"
import { Ticket } from "../ticketing/entities/ticket.entity"
import { Event } from "../ticketing/entities/event.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Refund, Ticket, Event])],
  controllers: [RefundController, TicketRefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundsModule {}
