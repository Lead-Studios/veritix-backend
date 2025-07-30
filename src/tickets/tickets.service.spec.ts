import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PaymentService } from './payment.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NftTicketsService } from '../nft-tickets/services/nft-tickets.service';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';

describe('TicketsService', () => {
  let service: TicketsService;
  let paymentService: PaymentService;
  let nftTicketsService: NftTicketsService;

  const mockNftTicket = {
    id: 'nftTicket123',
    purchaserWalletAddress: '0xCurrentOwner',
    status: 'minted',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PaymentService,
          useValue: {
            processPayment: jest.fn().mockResolvedValue('PAYMENT-123'),
          },
        },
        {
          provide: NftTicketsService,
          useValue: {
            getNftTicket: jest.fn().mockResolvedValue(mockNftTicket),
            transferNftTicketByDto: jest.fn().mockResolvedValue({
              success: true,
              transactionHash: '0xTransferTx',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    paymentService = module.get<PaymentService>(PaymentService);
    nftTicketsService = module.get<NftTicketsService>(NftTicketsService);
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initial ticket purchase', () => {
    it('should purchase tickets successfully', async () => {
      const dto: PurchaseTicketDto = {
        itemId: 'event1',
        price: 50,
        buyerWalletAddress: '0xBuyer',
        isSecondarySale: false,
      };
      const receipt = await service.purchaseTickets('user1', dto);
      expect(receipt).toHaveProperty('receiptId');
      expect(receipt.user.fullName).toBe('John Doe');
      expect(receipt.event.name).toBe('Concert A');
      expect(receipt.ticket.quantity).toBe(1);
      expect(paymentService.processPayment).toHaveBeenCalledWith('mockPaymentToken', 50);
    });

    it('should throw if user not found', async () => {
      const dto: PurchaseTicketDto = {
        itemId: 'event1',
        price: 50,
        buyerWalletAddress: '0xBuyer',
        isSecondarySale: false,
      };
      await expect(service.purchaseTickets('invalid', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if event not found', async () => {
      const dto: PurchaseTicketDto = {
        itemId: 'invalidEvent',
        price: 50,
        buyerWalletAddress: '0xBuyer',
        isSecondarySale: false,
      };
      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if not enough tickets', async () => {
      // Temporarily set available tickets to 0 for testing
      (service as any).events[0].availableTickets = 0;
      const dto: PurchaseTicketDto = {
        itemId: 'event1',
        price: 50,
        buyerWalletAddress: '0xBuyer',
        isSecondarySale: false,
      };
      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if payment fails', async () => {
      (paymentService.processPayment as jest.Mock).mockRejectedValueOnce(new Error('Payment failed'));
      const dto: PurchaseTicketDto = {
        itemId: 'event1',
        price: 50,
        buyerWalletAddress: '0xBuyer',
        isSecondarySale: false,
      };
      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow('Payment failed');
    });
  });

  describe('secondary ticket purchase (NFT transfer)', () => {
    it('should successfully transfer an NFT ticket in a secondary sale', async () => {
      const dto: PurchaseTicketDto = {
        itemId: 'nftTicket123',
        price: 100,
        buyerWalletAddress: '0xNewOwner',
        currentOwnerWalletAddress: '0xCurrentOwner',
        isSecondarySale: true,
      };

      const result = await service.purchaseTickets('user1', dto);

      expect(result).toEqual({
        success: true,
        transactionHash: '0xTransferTx',
        message: 'NFT ticket successfully transferred in secondary sale.',
      });
      expect(nftTicketsService.getNftTicket).toHaveBeenCalledWith(dto.itemId);
      expect(nftTicketsService.transferNftTicketByDto).toHaveBeenCalledWith({
        ticketId: dto.itemId,
        recipientWalletAddress: dto.buyerWalletAddress,
      });
    });

    it('should throw NotFoundException if NFT ticket not found for secondary sale', async () => {
      (nftTicketsService.getNftTicket as jest.Mock).mockResolvedValue(null);

      const dto: PurchaseTicketDto = {
        itemId: 'nonExistentNftTicket',
        price: 100,
        buyerWalletAddress: '0xNewOwner',
        currentOwnerWalletAddress: '0xCurrentOwner',
        isSecondarySale: true,
      };

      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if current owner wallet address does not match', async () => {
      (nftTicketsService.getNftTicket as jest.Mock).mockResolvedValue({
        ...mockNftTicket,
        purchaserWalletAddress: '0xWrongOwner',
      });

      const dto: PurchaseTicketDto = {
        itemId: 'nftTicket123',
        price: 100,
        buyerWalletAddress: '0xNewOwner',
        currentOwnerWalletAddress: '0xCurrentOwner',
        isSecondarySale: true,
      };

      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if NFT transfer fails', async () => {
      (nftTicketsService.transferNftTicketByDto as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Transfer failed on blockchain',
      });

      const dto: PurchaseTicketDto = {
        itemId: 'nftTicket123',
        price: 100,
        buyerWalletAddress: '0xNewOwner',
        currentOwnerWalletAddress: '0xCurrentOwner',
        isSecondarySale: true,
      };

      await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('should get receipt successfully', async () => {
    // First, make an initial purchase to have a receipt to retrieve
    const purchaseDto: PurchaseTicketDto = {
      itemId: 'event1',
      price: 50,
      buyerWalletAddress: '0xBuyer',
      isSecondarySale: false,
    };
    const receipt = await service.purchaseTickets('user1', purchaseDto);

    const found = await service.getReceipt(receipt.receiptId, 'user1');
    expect(found.receiptId).toBe(receipt.receiptId);
  });

  it('should throw if receipt not found', async () => {
    await expect(service.getReceipt('invalid', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
