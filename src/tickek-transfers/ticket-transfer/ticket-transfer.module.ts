import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TicketTransferController } from "./ticket-transfer.controller";
import { TicketTransferService } from "./ticket-transfer.service";
import { TicketTransfer } from "./entities/ticket-transfer.entity";
import { TicketModule } from "../../tickets/tickets.module";
import { UsersModule } from "../../users/users.module";
import { NotificationModule } from "../../notification/notification.module";
import { AuditLogModule } from "../../audit-log/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketTransfer]),
    TicketModule,
    UsersModule,
    NotificationModule,
    AuditLogModule,
  ],
  controllers: [TicketTransferController],
  providers: [TicketTransferService],
  exports: [TicketTransferService],
})
export class TicketTransferModule {}
