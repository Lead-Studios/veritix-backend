import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ticket } from "./entities/ticket.entity";
import { TicketService } from "./tickets.service";
import { TicketController } from "./tickets.controller";
import { PdfService } from "src/utils/pdf.service";

@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [TicketController],
  providers: [TicketService, PdfService],
  exports: [TicketService, PdfService]
})
export class TicketModule {}
