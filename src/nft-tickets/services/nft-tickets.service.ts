import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NftTicket,
  NftTicketStatus,
  NftPlatform,
} from '../entities/nft-ticket.entity';
import {
  NftMintingConfig,
  NftTicketType,
} from '../entities/nft-minting-config.entity';
import { TicketingEvent } from '../../ticketing/entities/event.entity';
import { PolygonService } from './polygon.service';
import { ZoraService } from './zora.service';
import { NftMetadataService, NftMetadata } from './nft-metadata.service';
import {
  MintNftTicketDto,
  NftTicketResponseDto,
} from '../dto/mint-nft-ticket.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NftTicketsService {
  private readonly logger = new Logger(NftTicketsService.name);

  constructor(
    @InjectRepository(NftTicket)
    private nftTicketRepository: Repository<NftTicket>,
    @InjectRepository(NftMintingConfig)
    private nftMintingConfigRepository: Repository<NftMintingConfig>,
    @InjectRepository(TicketingEvent)
    private eventRepository: Repository<TicketingEvent>,
    private polygonService: PolygonService,
    private zoraService: ZoraService,
    private nftMetadataService: NftMetadataService,
  ) {}

  /**
   * Mint NFT ticket
   */
  async mintNftTicket(
    mintDto: MintNftTicketDto,
  ): Promise<NftTicketResponseDto> {
    // 1. Get event and validate
    const event = await this.eventRepository.findOne({
      where: { id: mintDto.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Get or create NFT minting config
    let config = await this.nftMintingConfigRepository.findOne({
      where: { eventId: mintDto.eventId },
    });

    if (!config) {
      config = await this.createDefaultConfig(mintDto.eventId);
    }

    // 3. Check if NFT tickets are enabled
    if (!config.nftEnabled) {
      throw new BadRequestException(
        'NFT tickets are not enabled for this event',
      );
    }

    // 4. Create NFT ticket record
    const nftTicket = this.nftTicketRepository.create({
      id: uuidv4(),
      eventId: mintDto.eventId,
      purchaserId: mintDto.purchaserId,
      purchaserName: mintDto.purchaserName,
      purchaserEmail: mintDto.purchaserEmail,
      purchaserWalletAddress: mintDto.purchaserWalletAddress,
      platform:
        mintDto.platform || config.preferredPlatform || NftPlatform.POLYGON,
      status: NftTicketStatus.PENDING,
      pricePaid: mintDto.pricePaid,
      purchaseDate: new Date(),
      metadata: mintDto.metadata,
    });

    const savedTicket = await this.nftTicketRepository.save(nftTicket);

    // 5. Mint NFT if auto-mint is enabled
    if (config.autoMint || mintDto.autoMint) {
      await this.processMinting(savedTicket, event, config);
    }

    return this.mapToResponseDto(savedTicket);
  }

  /**
   * Process NFT minting
   */
  async processMinting(
    nftTicket: NftTicket,
    event: TicketingEvent,
    config: NftMintingConfig,
  ): Promise<void> {
    try {
      // Update status to minting
      await this.nftTicketRepository.update(nftTicket.id, {
        status: NftTicketStatus.MINTING,
      });

      // Generate metadata
      const metadata = this.nftMetadataService.generateTicketMetadata(
        event,
        nftTicket,
        config,
      );

      // Validate metadata
      const validation = this.nftMetadataService.validateMetadata(metadata);
      if (!validation.isValid) {
        throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
      }

      // Mint based on platform
      let mintResult;
      if (nftTicket.platform === NftPlatform.POLYGON) {
        mintResult = await this.polygonService.mintNft(
          config.contractAddress!,
          nftTicket.purchaserWalletAddress || nftTicket.purchaserId,
          metadata,
        );
      } else if (nftTicket.platform === NftPlatform.ZORA) {
        mintResult = await this.zoraService.mintNft(
          config.contractAddress!,
          nftTicket.purchaserWalletAddress || nftTicket.purchaserId,
          metadata,
        );
      } else {
        throw new Error(`Unsupported platform: ${nftTicket.platform}`);
      }

      if (mintResult.success) {
        // Update ticket with minting results
        await this.nftTicketRepository.update(nftTicket.id, {
          status: NftTicketStatus.MINTED,
          tokenId: mintResult.tokenId,
          contractAddress: mintResult.contractAddress,
          tokenUri: mintResult.tokenUri,
          transactionHash: mintResult.transactionHash,
          mintedAt: new Date(),
          metadata: JSON.stringify(metadata),
        });

        this.logger.log(`NFT ticket minted successfully: ${nftTicket.id}`);
      } else {
        throw new Error(mintResult.error || 'Minting failed');
      }
    } catch (error) {
      this.logger.error(`Failed to mint NFT ticket: ${error.message}`);

      // Update ticket with error
      await this.nftTicketRepository.update(nftTicket.id, {
        status: NftTicketStatus.FAILED,
        errorMessage: error.message,
        retryCount: nftTicket.retryCount + 1,
        lastRetryAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Retry failed minting
   */
  async retryMinting(nftTicketId: string): Promise<NftTicketResponseDto> {
    const nftTicket = await this.nftTicketRepository.findOne({
      where: { id: nftTicketId },
      relations: ['event'],
    });

    if (!nftTicket) {
      throw new NotFoundException('NFT ticket not found');
    }

    if (nftTicket.status !== NftTicketStatus.FAILED) {
      throw new BadRequestException('Only failed tickets can be retried');
    }

    const config = await this.nftMintingConfigRepository.findOne({
      where: { eventId: nftTicket.eventId },
    });

    if (!config) {
      throw new NotFoundException('NFT minting config not found');
    }

    await this.processMinting(nftTicket, nftTicket.event, config);

    const updatedTicket = await this.nftTicketRepository.findOne({
      where: { id: nftTicketId },
    });

    return this.mapToResponseDto(updatedTicket!);
  }

  /**
   * Get NFT ticket by ID
   */
  async getNftTicket(nftTicketId: string): Promise<NftTicketResponseDto> {
    const nftTicket = await this.nftTicketRepository.findOne({
      where: { id: nftTicketId },
      relations: ['event'],
    });

    if (!nftTicket) {
      throw new NotFoundException('NFT ticket not found');
    }

    return this.mapToResponseDto(nftTicket);
  }

  /**
   * Get NFT tickets by event
   */
  async getNftTicketsByEvent(eventId: string): Promise<NftTicketResponseDto[]> {
    const nftTickets = await this.nftTicketRepository.find({
      where: { eventId },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });

    return nftTickets.map((ticket) => this.mapToResponseDto(ticket));
  }

  /**
   * Get NFT tickets by purchaser
   */
  async getNftTicketsByPurchaser(
    purchaserId: string,
  ): Promise<NftTicketResponseDto[]> {
    const nftTickets = await this.nftTicketRepository.find({
      where: { purchaserId },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });

    return nftTickets.map((ticket) => this.mapToResponseDto(ticket));
  }

  /**
   * Configure NFT minting for an event
   */
  async configureNftMinting(
    eventId: string,
    config: Partial<NftMintingConfig>,
  ): Promise<NftMintingConfig> {
    let existingConfig = await this.nftMintingConfigRepository.findOne({
      where: { eventId },
    });

    if (existingConfig) {
      // Update existing config
      Object.assign(existingConfig, config);
      return this.nftMintingConfigRepository.save(existingConfig);
    } else {
      // Create new config
      const newConfig = this.nftMintingConfigRepository.create({
        id: uuidv4(),
        eventId,
        ...config,
      });
      return this.nftMintingConfigRepository.save(newConfig);
    }
  }

  /**
   * Get NFT minting config for an event
   */
  async getNftMintingConfig(eventId: string): Promise<NftMintingConfig | null> {
    return this.nftMintingConfigRepository.findOne({
      where: { eventId },
    });
  }

  /**
   * Transfer NFT ticket
   */
  async transferNftTicket(
    nftTicketId: string,
    fromAddress: string,
    toAddress: string,
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const nftTicket = await this.nftTicketRepository.findOne({
      where: { id: nftTicketId },
    });

    if (!nftTicket) {
      throw new NotFoundException('NFT ticket not found');
    }

    if (nftTicket.status !== NftTicketStatus.MINTED) {
      throw new BadRequestException('Only minted tickets can be transferred');
    }

    const config = await this.nftMintingConfigRepository.findOne({
      where: { eventId: nftTicket.eventId },
    });

    if (!config?.allowTransfer) {
      throw new BadRequestException('Transfer is not allowed for this event');
    }

    let transferResult;
    if (nftTicket.platform === NftPlatform.POLYGON) {
      transferResult = await this.polygonService.transferNft(
        nftTicket.contractAddress!,
        fromAddress,
        toAddress,
        nftTicket.tokenId!,
      );
    } else if (nftTicket.platform === NftPlatform.ZORA) {
      transferResult = await this.zoraService.transferNft(
        nftTicket.contractAddress!,
        fromAddress,
        toAddress,
        nftTicket.tokenId!,
      );
    } else {
      throw new Error(`Unsupported platform: ${nftTicket.platform}`);
    }

    if (transferResult.success) {
      await this.nftTicketRepository.update(nftTicketId, {
        status: NftTicketStatus.TRANSFERRED,
        transferredAt: new Date(),
      });
    }

    return transferResult;
  }

  /**
   * Burn NFT ticket (if configured)
   */
  async burnNftTicket(
    nftTicketId: string,
    ownerAddress: string,
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const nftTicket = await this.nftTicketRepository.findOne({
      where: { id: nftTicketId },
    });

    if (!nftTicket) {
      throw new NotFoundException('NFT ticket not found');
    }

    const config = await this.nftMintingConfigRepository.findOne({
      where: { eventId: nftTicket.eventId },
    });

    if (!config?.burnAfterEvent) {
      throw new BadRequestException('Burning is not enabled for this event');
    }

    let burnResult;
    if (nftTicket.platform === NftPlatform.POLYGON) {
      burnResult = await this.polygonService.burnNft(
        nftTicket.contractAddress!,
        nftTicket.tokenId!,
        ownerAddress,
      );
    } else if (nftTicket.platform === NftPlatform.ZORA) {
      burnResult = await this.zoraService.burnNft(
        nftTicket.contractAddress!,
        nftTicket.tokenId!,
        ownerAddress,
      );
    } else {
      throw new Error(`Unsupported platform: ${nftTicket.platform}`);
    }

    return burnResult;
  }

  /**
   * Get minting statistics for an event
   */
  async getMintingStats(eventId: string): Promise<{
    total: number;
    pending: number;
    minting: number;
    minted: number;
    failed: number;
    transferred: number;
  }> {
    const [total, pending, minting, minted, failed, transferred] =
      await Promise.all([
        this.nftTicketRepository.count({ where: { eventId } }),
        this.nftTicketRepository.count({
          where: { eventId, status: NftTicketStatus.PENDING },
        }),
        this.nftTicketRepository.count({
          where: { eventId, status: NftTicketStatus.MINTING },
        }),
        this.nftTicketRepository.count({
          where: { eventId, status: NftTicketStatus.MINTED },
        }),
        this.nftTicketRepository.count({
          where: { eventId, status: NftTicketStatus.FAILED },
        }),
        this.nftTicketRepository.count({
          where: { eventId, status: NftTicketStatus.TRANSFERRED },
        }),
      ]);

    return {
      total,
      pending,
      minting,
      minted,
      failed,
      transferred,
    };
  }

  // Helper methods
  private async createDefaultConfig(
    eventId: string,
  ): Promise<NftMintingConfig> {
    const config = this.nftMintingConfigRepository.create({
      id: uuidv4(),
      eventId,
      ticketType: NftTicketType.QR, // Default to QR tickets
      nftEnabled: false, // Disabled by default
      preferredPlatform: NftPlatform.POLYGON,
      allowTransfer: true,
      burnAfterEvent: false,
      autoMint: false,
      maxRetries: 3,
      retryDelay: 300000, // 5 minutes
    });

    return this.nftMintingConfigRepository.save(config);
  }

  private mapToResponseDto(nftTicket: NftTicket): NftTicketResponseDto {
    return {
      id: nftTicket.id,
      eventId: nftTicket.eventId,
      purchaserId: nftTicket.purchaserId,
      purchaserName: nftTicket.purchaserName,
      purchaserEmail: nftTicket.purchaserEmail,
      purchaserWalletAddress: nftTicket.purchaserWalletAddress,
      platform: nftTicket.platform,
      status: nftTicket.status,
      contractAddress: nftTicket.contractAddress,
      tokenId: nftTicket.tokenId,
      tokenUri: nftTicket.tokenUri,
      transactionHash: nftTicket.transactionHash,
      pricePaid: nftTicket.pricePaid,
      purchaseDate: nftTicket.purchaseDate,
      mintedAt: nftTicket.mintedAt,
      errorMessage: nftTicket.errorMessage,
      metadata: nftTicket.metadata,
    };
  }
}
