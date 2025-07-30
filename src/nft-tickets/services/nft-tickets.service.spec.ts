import { Test, TestingModule } from '@nestjs/testing';
import { NftTicketsService } from './nft-tickets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftTicket, NftTicketStatus, NftPlatform } from '../entities/nft-ticket.entity';
import { NftMintingConfig } from '../entities/nft-minting-config.entity';
import { TicketingEvent } from '../../ticketing/entities/event.entity';
import { PolygonService } from './polygon.service';
import { ZoraService } from './zora.service';
import { NftMetadataService } from './nft-metadata.service';
import { TransferNftTicketDto } from '../dto/transfer-nft-ticket.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('NftTicketsService', () => {
  let service: NftTicketsService;
  let nftTicketRepository: Repository<NftTicket>;
  let nftMintingConfigRepository: Repository<NftMintingConfig>;
  let polygonService: PolygonService;
  let zoraService: ZoraService;

  const mockNftTicket = {
    id: 'ticket123',
    eventId: 'event456',
    purchaserId: 'user789',
    purchaserName: 'John Doe',
    purchaserEmail: 'john.doe@example.com',
    purchaserWalletAddress: '0xCurrentOwner',
    platform: NftPlatform.POLYGON,
    status: NftTicketStatus.MINTED,
    contractAddress: '0xContract',
    tokenId: '1',
    tokenUri: 'http://example.com/token/1',
    transactionHash: '0xMintTx',
    pricePaid: 100,
    purchaseDate: new Date(),
    mintedAt: new Date(),
    transferredAt: null,
    errorMessage: null,
    retryCount: 0,
    lastRetryAt: null,
    transferHistory: [],
  };

  const mockNftMintingConfig = {
    id: 'config123',
    eventId: 'event456',
    nftEnabled: true,
    allowTransfer: true,
    preferredPlatform: NftPlatform.POLYGON,
    contractAddress: '0xContract',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftTicketsService,
        {
          provide: getRepositoryToken(NftTicket),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(NftMintingConfig),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TicketingEvent),
          useClass: Repository,
        },
        {
          provide: PolygonService,
          useValue: {
            transferNft: jest.fn(),
          },
        },
        {
          provide: ZoraService,
          useValue: {
            transferNft: jest.fn(),
          },
        },
        {
          provide: NftMetadataService,
          useValue: {
            generateTicketMetadata: jest.fn(),
            validateMetadata: jest.fn(() => ({ isValid: true, errors: [] })),
          },
        },
      ],
    }).compile();

    service = module.get<NftTicketsService>(NftTicketsService);
    nftTicketRepository = module.get<Repository<NftTicket>>(
      getRepositoryToken(NftTicket),
    );
    nftMintingConfigRepository = module.get<Repository<NftMintingConfig>>(
      getRepositoryToken(NftMintingConfig),
    );
    polygonService = module.get<PolygonService>(PolygonService);
    zoraService = module.get<ZoraService>(ZoraService);

    // Mock repository methods
    jest.spyOn(nftTicketRepository, 'findOne').mockResolvedValue(mockNftTicket as NftTicket);
    jest.spyOn(nftTicketRepository, 'update').mockResolvedValue(undefined);
    jest.spyOn(nftMintingConfigRepository, 'findOne').mockResolvedValue(mockNftMintingConfig as NftMintingConfig);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transferNftTicketByDto', () => {
    it('should successfully transfer an NFT ticket', async () => {
      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      (polygonService.transferNft as jest.Mock).mockResolvedValue({
        success: true,
        transactionHash: '0xTransferTx',
      });

      const result = await service.transferNftTicketByDto(transferDto);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('0xTransferTx');
      expect(nftTicketRepository.findOne).toHaveBeenCalledWith({
        where: { id: transferDto.ticketId },
      });
      expect(nftMintingConfigRepository.findOne).toHaveBeenCalledWith({
        where: { eventId: mockNftTicket.eventId },
      });
      expect(polygonService.transferNft).toHaveBeenCalledWith(
        mockNftTicket.contractAddress,
        mockNftTicket.purchaserWalletAddress,
        transferDto.recipientWalletAddress,
        mockNftTicket.tokenId,
      );
      expect(nftTicketRepository.update).toHaveBeenCalledWith(
        mockNftTicket.id,
        expect.objectContaining({
          status: NftTicketStatus.TRANSFERRED,
          transferredAt: expect.any(Date),
          previousOwnerWalletAddress: mockNftTicket.purchaserWalletAddress,
          purchaserWalletAddress: transferDto.recipientWalletAddress,
          transferHistory: expect.arrayContaining([
            expect.objectContaining({
              fromAddress: mockNftTicket.purchaserWalletAddress,
              toAddress: transferDto.recipientWalletAddress,
              transactionHash: '0xTransferTx',
              timestamp: expect.any(Date),
            }),
          ]),
        }),
      );
    });

    it('should throw NotFoundException if NFT ticket is not found', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue(null);

      const transferDto: TransferNftTicketDto = {
        ticketId: 'nonexistentTicket',
        recipientWalletAddress: '0xNewOwner',
      };

      await expect(service.transferNftTicketByDto(transferDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if ticket does not have an owner wallet address', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        purchaserWalletAddress: null,
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      await expect(service.transferNftTicketByDto(transferDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(nftTicketRepository.findOne).toHaveBeenCalledWith({
        where: { id: transferDto.ticketId },
      });
    });

    it('should throw BadRequestException if ticket is not minted or transferred', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        status: NftTicketStatus.PENDING,
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      await expect(service.transferNftTicketByDto(transferDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if transfer is not allowed for the event', async () => {
      (nftMintingConfigRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftMintingConfig,
        allowTransfer: false,
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      await expect(service.transferNftTicketByDto(transferDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return success: false if blockchain transfer fails', async () => {
      (polygonService.transferNft as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Blockchain error',
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      const result = await service.transferNftTicketByDto(transferDto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Blockchain error');
      expect(nftTicketRepository.update).not.toHaveBeenCalledWith(
        mockNftTicket.id,
        expect.objectContaining({
          status: NftTicketStatus.TRANSFERRED,
        }),
      );
    });

    it('should handle Zora platform transfers', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        platform: NftPlatform.ZORA,
      });

      (zoraService.transferNft as jest.Mock).mockResolvedValue({
        success: true,
        transactionHash: '0xZoraTransferTx',
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      const result = await service.transferNftTicketByDto(transferDto);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('0xZoraTransferTx');
      expect(zoraService.transferNft).toHaveBeenCalledWith(
        mockNftTicket.contractAddress,
        mockNftTicket.purchaserWalletAddress,
        transferDto.recipientWalletAddress,
        mockNftTicket.tokenId,
      );
      expect(polygonService.transferNft).not.toHaveBeenCalled();
    });

    it('should throw an error for unsupported platforms', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        platform: 'unsupported' as NftPlatform, // Cast to NftPlatform for testing purposes
      });

      const transferDto: TransferNftTicketDto = {
        ticketId: 'ticket123',
        recipientWalletAddress: '0xNewOwner',
      };

      await expect(service.transferNftTicketByDto(transferDto)).rejects.toThrow(
        'Unsupported platform: unsupported',
      );
    });
  });
});
