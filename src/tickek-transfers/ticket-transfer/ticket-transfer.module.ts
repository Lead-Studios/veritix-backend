import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TicketTransferController } from "./ticket-transfer.controller"
import { TicketTransferService } from "./ticket-transfer.service"
import { TicketTransfer } from "./entities/ticket-transfer.entity"
import { TicketsModule } from "../tickets/tickets.module"
import { UsersModule } from "../users/users.module"
import { NotificationsModule } from "../notifications/notifications.module"

@Module({
  imports: [TypeOrmModule.forFeature([TicketTransfer]), TicketsModule, UsersModule, NotificationsModule],
  controllers: [TicketTransferController],
  providers: [TicketTransferService],
  exports: [TicketTransferService],
})
export class TicketTransferModule {}

