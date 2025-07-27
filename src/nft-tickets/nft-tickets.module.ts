import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftTicketsController } from './controllers/nft-tickets.controller';
import { NftTicketsService } from './services/nft-tickets.service';
import { NftTicket } from './entities/nft-ticket.entity';
import { NftMintingConfig } from './entities/nft-minting-config.entity';
import { PolygonService } from './services/polygon.service';
import { ZoraService } from './services/zora.service';
import { NftMetadataService } from './services/nft-metadata.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftTicket,
      NftMintingConfig,
    ]),
  ],
  controllers: [NftTicketsController],
  providers: [
    NftTicketsService,
    PolygonService,
    ZoraService,
    NftMetadataService,
  ],
  exports: [NftTicketsService],
})
export class NftTicketsModule {} 