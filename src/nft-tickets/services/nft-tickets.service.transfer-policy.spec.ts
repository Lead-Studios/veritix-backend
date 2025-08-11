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
import { BadRequestException } from '@nestjs/common';

describe('NftTicketsService - Resale Policy', () => {
  let service: NftTicketsService;
  let nftTicketRepository: Repository<NftTicket>;
  let eventRepository: Repository<TicketingEvent>;

  const mockNftTicket = {
    id: 'ticket123',
    eventId: 'event456',
    purchaserWalletAddress: '0xCurrentOwner',
    status: NftTicketStatus.MINTED,
  } as NftTicket;

  const baseEvent = {
    id: 'event456',
    resaleLocked: false,
    transferDeadline: null,
    maxResalePrice: 100,
  } as TicketingEvent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftTicketsService,
        { provide: getRepositoryToken(NftTicket), useValue: { findOne: jest.fn().mockResolvedValue(mockNftTicket), update: jest.fn() } },
        { provide: getRepositoryToken(NftMintingConfig), useValue: {} },
        { provide: getRepositoryToken(TicketingEvent), useValue: { findOne: jest.fn().mockResolvedValue(baseEvent) } },
        { provide: PolygonService, useValue: { transferNft: jest.fn() } },
        { provide: ZoraService, useValue: { transferNft: jest.fn() } },
        { provide: NftMetadataService, useValue: {} },
      ],
    }).compile();
    service = module.get<NftTicketsService>(NftTicketsService);
    nftTicketRepository = module.get<Repository<NftTicket>>(getRepositoryToken(NftTicket));
    eventRepository = module.get<Repository<TicketingEvent>>(getRepositoryToken(TicketingEvent));
  });

  it('should throw if resale is locked', async () => {
    jest.spyOn(eventRepository, 'findOne').mockResolvedValueOnce({ ...baseEvent, resaleLocked: true });
    await expect(
      service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: 50 })
    ).rejects.toThrow('Resale is currently locked for this event.');
  });

  it('should throw if transfer deadline has passed', async () => {
    jest.spyOn(eventRepository, 'findOne').mockResolvedValueOnce({ ...baseEvent, transferDeadline: new Date(Date.now() - 1000) });
    await expect(
      service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: 50 })
    ).rejects.toThrow('Transfer deadline for resale has passed.');
  });

  it('should throw if maxResalePrice is not set', async () => {
    jest.spyOn(eventRepository, 'findOne').mockResolvedValueOnce({ ...baseEvent, maxResalePrice: null });
    await expect(
      service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: 50 })
    ).rejects.toThrow('Max resale price policy is not set for this event.');
  });

  it('should throw if resalePrice is missing or invalid', async () => {
    await expect(
      service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: NaN })
    ).rejects.toThrow('A valid resale price must be provided for NFT transfer.');
  });

  it('should throw if resalePrice exceeds maxResalePrice', async () => {
    await expect(
      service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: 150 })
    ).rejects.toThrow('Resale price (150) exceeds the maximum allowed resale price (100).');
  });

  it('should allow transfer if all policy checks pass', async () => {
    jest.spyOn(service as any, 'transferNftTicketInternal').mockResolvedValue({ success: true, transactionHash: '0xTx' });
    const result = await service.transferNftTicketByDto({ ticketId: 'ticket123', recipientWalletAddress: '0xNew', resalePrice: 80 });
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBe('0xTx');
  });
});
