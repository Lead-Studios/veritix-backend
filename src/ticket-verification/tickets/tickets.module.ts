import { Module } from "@nestjs/common"
import { TicketsController } from "./tickets.controller"
import { TicketsService } from "./tickets.service"
import { BlockchainModule } from "../blockchain/blockchain.module"

@Module({
  imports: [BlockchainModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

