import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ticket } from "./entities/ticket.entity";
import { TicketService } from "./tickets.service";
import { TicketController } from "./tickets.controller";
import { PdfService } from "src/utils/pdf.service";
import { StripePaymentService } from "src/payment/services/stripe-payment.service";
import { TicketPurchase } from "./entities/ticket-pruchase";
import { Event } from "src/events/entities/event.entity";
import { TicketPurchaseController } from "./ticket-purchase.controller";
import { UsersModule } from "src/users/users.module";
import { TicketPurchaseService } from "./provider/tickets-purchase.service";

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketPurchase, Event,]), UsersModule],
  controllers: [TicketController, TicketPurchaseController],
  providers: [TicketService, PdfService, TicketPurchaseService, {
    provide: 'PaymentServiceInterface',
    useClass: StripePaymentService,
  },],
  exports: [TicketService, PdfService]
})
export class TicketModule {}
