import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsBoolean } from 'class-validator';
import { NftPlatform } from '../entities/nft-ticket.entity';

export class MintNftTicketDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  purchaserId: string;

  @IsString()
  purchaserName: string;

  @IsString()
  purchaserEmail: string;

  @IsString()
  @IsOptional()
  purchaserWalletAddress?: string;

  @IsEnum(NftPlatform)
  @IsOptional()
  platform?: NftPlatform;

  @IsNumber()
  pricePaid: number;

  @IsString()
  @IsOptional()
  metadata?: string; // JSON string of custom metadata

  @IsBoolean()
  @IsOptional()
  autoMint?: boolean;
}

export class NftTicketResponseDto {
  id: string;
  eventId: string;
  purchaserId: string;
  purchaserName: string;
  purchaserEmail: string;
  purchaserWalletAddress?: string;
  platform: NftPlatform;
  status: string;
  contractAddress?: string;
  tokenId?: string;
  tokenUri?: string;
  transactionHash?: string;
  pricePaid: number;
  purchaseDate: Date;
  mintedAt?: Date;
  errorMessage?: string;
  metadata?: string;
}

export class NftMintingConfigDto {
  eventId: string;
  ticketType: string;
  preferredPlatform?: NftPlatform;
  nftEnabled: boolean;
  contractAddress?: string;
  contractName?: string;
  contractSymbol?: string;
  baseTokenUri?: string;
  metadataTemplate?: string;
  organizerWalletAddress?: string;
  royaltyPercentage?: string;
  royaltyRecipient?: string;
  allowTransfer: boolean;
  burnAfterEvent: boolean;
  customMetadata?: string;
  autoMint: boolean;
  maxRetries: number;
  retryDelay: number;
} 