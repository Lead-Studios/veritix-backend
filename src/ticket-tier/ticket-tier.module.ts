import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TicketTierService } from "src/ticket-tier/ticket-tier.service";
import { TicketTierController } from "./ticket-tier.controller";
import { TicketTier } from "./entities/ticket-tier.entity";
import { EventsModule } from "src/events/events.module";

@Module({
  imports: [TypeOrmModule.forFeature([TicketTier]), EventsModule],
  providers: [TicketTierService],
  controllers: [TicketTierController],
})
export class TicketTierModule {}
