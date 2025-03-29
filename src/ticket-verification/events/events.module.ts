import { Module } from "@nestjs/common"
import { EventsController } from "./events.controller"
import { EventsService } from "./events.service"
import { BlockchainModule } from "../blockchain/blockchain.module"

@Module({
  imports: [BlockchainModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

