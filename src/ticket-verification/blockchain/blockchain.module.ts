import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { BlockchainService } from "./blockchain.service"

@Module({
  imports: [ConfigModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}

