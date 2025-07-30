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
import { Erc721Metadata } from '../interfaces/erc721-metadata.interface';

describe('NftTicketsService', () => {
  let service: NftTicketsService;
  let nftTicketRepository: Repository<NftTicket>;
  let nftMintingConfigRepository: Repository<NftMintingConfig>;
  let polygonService: PolygonService;
  let zoraService: ZoraService;
  let nftMetadataService: NftMetadataService;

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
    event: { // Mock event data for relations
      id: 'event456',
      name: 'Test Event',
      description: 'A test event',
      location: 'Test Location',
      startDate: new Date(),
      endDate: new Date(),
    } as TicketingEvent,
  };

  const mockNftMintingConfig = {
    id: 'config123',
    eventId: 'event456',
    nftEnabled: true,
    allowTransfer: true,
    preferredPlatform: NftPlatform.POLYGON,
    contractAddress: '0xContract',
  };

  const mockErc721Metadata: Erc721Metadata = {
    name: 'Test Event - Ticket #1',
    description: 'A test event ticket',
    image: 'http://example.com/image.png',
    attributes: [
      { trait_type: 'Event', value: 'Test Event' },
      { trait_type: 'Ticket ID', value: 'ticket123' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftTicketsService,
        {
          provide: getRepositoryToken(NftTicket),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockNftTicket),
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(NftMintingConfig),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockNftMintingConfig),
            create: jest.fn().mockReturnValue(mockNftMintingConfig),
          },
        },
        {
          provide: getRepositoryToken(TicketingEvent),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockNftTicket.event),
          },
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
            generateTicketMetadata: jest.fn().mockReturnValue(mockErc721Metadata),
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
    nftMetadataService = module.get<NftMetadataService>(NftMetadataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getErc721Metadata', () => {
    it('should return ERC-721 metadata for a given NFT ticket ID', async () => {
      const result = await service.getErc721Metadata(mockNftTicket.id);

      expect(nftTicketRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockNftTicket.id },
        relations: ['event'],
      });
      expect(nftMetadataService.generateTicketMetadata).toHaveBeenCalledWith(
        mockNftTicket.event,
        mockNftTicket,
        mockNftMintingConfig,
      );
      expect(result).toEqual(mockErc721Metadata);
    });

    it('should throw NotFoundException if NFT ticket is not found', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getErc721Metadata('nonexistentTicket')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if associated event is not found', async () => {
      (nftTicketRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        event: null,
      });

      await expect(service.getErc721Metadata(mockNftTicket.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use a default config if minting config is not found', async () => {
      (nftMintingConfigRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getErc721Metadata(mockNftTicket.id);

      expect(nftMintingConfigRepository.create).toHaveBeenCalled();
      expect(nftMetadataService.generateTicketMetadata).toHaveBeenCalledWith(
        mockNftTicket.event,
        mockNftTicket,
        expect.any(Object), // Expecting the default config created by the service
      );
      expect(result).toEqual(mockErc721Metadata);
    });
  });
});
