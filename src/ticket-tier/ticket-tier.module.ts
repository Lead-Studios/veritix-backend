import { Module } from "@nestjs/common";
import { TicketTierService } from "src/ticket-tier/ticket-tier.service";
import { TicketTierController } from "./ticket-tier.controller";
import { TicketTier } from "./entities/ticket-tier.entity";
import { TicketHistory } from "../ticket/entities/ticket-history.entity";
import { EventsModule } from "../events/events.module";
import { PricingStrategyService } from "./services/pricing-strategy.service";
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TenantRepositoryModule.forFeature([TicketTier, TicketHistory]), 
    EventsModule
  ],
  providers: [TicketTierService, PricingStrategyService],
  controllers: [TicketTierController],
  exports: [TicketTierService, PricingStrategyService],
})
export class TicketTierModule {}
