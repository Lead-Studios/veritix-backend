import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { Event } from "./entities/event.entity";
// import { Ticket } from "../tickets/entities/ticket.entity";
// import { SpecialGuest } from "../special-guests/entities/special-guest.entity";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { Collaborator } from "src/collaborator/entities/collaborator.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Event, Collaborator /* Ticket, SpecialGuest */])],
  controllers: [EventsController],
  providers: [EventsService, JwtAuthGuard, RolesGuard],
  exports: [EventsService],
})
export class EventsModule {}
