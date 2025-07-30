import { Module } from "@nestjs/common"
import { TicketHoldController } from "./controllers/ticket-hold.controller"
import { TicketHoldService } from "./services/ticket-hold.service"
import { TicketInventoryService } from "./services/ticket-inventory.service"
import { TicketHoldGateway } from "./gateways/ticket-hold.gateway"
import { TicketHold } from "./entities/ticket-hold.entity"
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TenantRepositoryModule.forFeature([TicketHold]),
    // No need for NestJS ScheduleModule.forRoot() here, as we're using setTimeout directly
  ],
  controllers: [TicketHoldController],
  providers: [TicketHoldService, TicketInventoryService, TicketHoldGateway],
  exports: [TicketHoldService, TicketInventoryService, TicketHoldGateway], // Export if other modules need them
})
export class SmartTicketModule {}
