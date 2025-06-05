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
import { User } from "src/users/entities/user.entity";
import { ConferenceService } from "src/conference/providers/conference.service";
import { Conference } from "src/conference/entities/conference.entity";
import { GroupTicket } from "./entities/group-ticket.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketPurchase, GroupTicket, Event, User, Conference]),
    UsersModule,
  ],
  controllers: [TicketController, TicketPurchaseController],
  providers: [
    TicketService,
    PdfService,
    TicketPurchaseService,
    ConferenceService,
    {
      provide: "PaymentServiceInterface",
      useClass: StripePaymentService,
    },
  ],
  exports: [TicketService, PdfService],
})
export class TicketModule {}
