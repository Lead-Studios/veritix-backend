import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { Event } from "./entities/event.entity";
import { Ticket } from "../tickets/entities/ticket.entity";
// import { SpecialGuest } from "../special-guests/entities/special-guest.entity";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { Collaborator } from "src/collaborator/entities/collaborator.entity";
import { EventRevenueAnalyticsController } from "./event-revenue-analytics.controller";
import { EventRevenueAnalyticsService } from "./event-revenue-analytics.service";
import { CategoryModule } from "src/category/category.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { EventView } from "./entities/event-view.entity";
import { PurchaseLog } from "./entities/purchase-log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Collaborator,
      EventView, 
      PurchaseLog,
      Ticket /* Ticket, SpecialGuest */,
    ]),
    CategoryModule,
  ],
  controllers: [EventsController, EventRevenueAnalyticsController, AnalyticsController],
  providers: [
    EventsService,
    AnalyticsService,
    JwtAuthGuard,
    RolesGuard,
    EventRevenueAnalyticsService,
  ],
  exports: [EventsService, EventRevenueAnalyticsService, AnalyticsService],
})
export class EventsModule {}
