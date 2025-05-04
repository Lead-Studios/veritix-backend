import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "src/events/entities/event.entity";
import { Ticket } from "src/tickets/entities/ticket.entity";
import { DashboardController } from "./dashboard.controller";
import { EventDashboardService } from "./dashboard.service";

@Module({
  imports: [TypeOrmModule.forFeature([Event, Ticket])],
  controllers: [DashboardController],
  providers: [EventDashboardService],
  exports: [EventDashboardService],
})
export class EventDashboardModule {}
