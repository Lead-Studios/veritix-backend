import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { ReceiptDto } from './dto/receipt.dto';
import { TicketPurchase } from './entity/ticket.entity';
import { PaymentService } from './payment.service';
import { Event } from './interfaces/event.interface';
import { User } from './interfaces/user.interface';
import { TicketPurchaseStatus } from './enums/ticket-purchase-status.enum';
import { NftTicketsService } from '../nft-tickets/services/nft-tickets.service';
import { NftTicketStatus } from '../nft-tickets/entities/nft-ticket.entity';

@Injectable()
export class TicketsService {
  // In-memory stores for demo
  private events: Event[] = [
    {
      id: 'event1',
      name: 'Concert A',
      date: new Date('2024-08-01'),
      location: 'Stadium X',
      availableTickets: 100,
      pricePerTicket: 50,
    },
  ];
  private users: User[] = [
    { id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
  ];
  private purchases: TicketPurchase[] = [];

  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly nftTicketsService: NftTicketsService,
  ) {}

  async applyPromoCode(eventId: string, code: string) {
    // For demo: always 10% off if code is 'PROMO10' and event matches
    if (code === 'PROMO10') {
      const event = this.events.find(e => e.id === eventId);
      if (!event) throw new BadRequestException('Event not found');
      return { valid: true, discount: 0.1 };
    }
    throw new BadRequestException('Invalid promo code');
  }

  async purchaseTickets(userId: string, dto: PurchaseTicketDto): Promise<ReceiptDto | { success: boolean; transactionHash?: string; message?: string }> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new NotFoundException('User not found');

    if (dto.isSecondarySale) {
      this.logger.log(`Processing secondary sale for ticket ID: ${dto.itemId}`);
      // Secondary sale: NFT ticket transfer
      const nftTicket = await this.nftTicketsService.getNftTicket(dto.itemId);

      if (!nftTicket) {
        throw new NotFoundException('NFT Ticket not found for secondary sale.');
      }

      // Validate current owner
      if (nftTicket.purchaserWalletAddress !== dto.currentOwnerWalletAddress) {
        throw new BadRequestException('Current owner wallet address does not match ticket owner.');
      }

      // Process payment for secondary sale (if applicable, e.g., platform fees)
      // For simplicity, assuming direct transfer for now, no separate payment processing for the ticket price itself
      // In a real scenario, payment for the ticket would be handled between buyer and seller,
      // and platform might take a cut.

      try {
        const transferResult = await this.nftTicketsService.transferNftTicketByDto({
          ticketId: dto.itemId,
          recipientWalletAddress: dto.buyerWalletAddress,
        });

        if (transferResult.success) {
          this.logger.log(`Secondary sale successful for ticket ${dto.itemId}. Transaction Hash: ${transferResult.transactionHash}`);
          // Log successful secondary transfer in backend (e.g., a new purchase record or update existing)
          // For now, we'll just return the transfer result.
          return {
            success: true,
            transactionHash: transferResult.transactionHash,
            message: 'NFT ticket successfully transferred in secondary sale.',
          };
        } else {
          this.logger.error(`Secondary sale failed for ticket ${dto.itemId}: ${transferResult.error}`);
          throw new BadRequestException(transferResult.error || 'NFT ticket transfer failed.');
        }
      } catch (error) {
        this.logger.error(`Error during secondary sale for ticket ${dto.itemId}: ${error.message}`);
        throw new BadRequestException(`Secondary sale failed: ${error.message}`);
      }

    } else {
      this.logger.log(`Processing initial sale for event ID: ${dto.itemId}`);
      // Initial sale: Mint new ticket or reduce available tickets
      const event = this.events.find(e => e.id === dto.itemId);
      if (!event) throw new NotFoundException('Event not found');
      if (1 > event.availableTickets) { // Assuming 1 ticket per purchase for simplicity
        throw new BadRequestException('Not enough tickets available');
      }

      let discount = 0;
      // Assuming promo codes are for initial sales
      // if (dto.promoCode) {
      //   try {
      //     const promo = await this.applyPromoCode(dto.itemId, dto.promoCode);
      //     discount = promo.discount;
      //   } catch (e) {
      //     throw new BadRequestException('Invalid or expired promo code');
      //   }
      // }

      let totalPrice = event.pricePerTicket; // Assuming price from DTO is the final price for initial sale
      // if (discount > 0) {
      //   totalPrice = totalPrice * (1 - discount);
      // }

      // Process payment
      const paymentConfirmationId = await this.paymentService.processPayment('mockPaymentToken', totalPrice); // Assuming a mock token for now

      // Update event ticket inventory
      event.availableTickets -= 1; // Assuming 1 ticket per purchase

      // Create purchase record
      const purchase: TicketPurchase = {
        id: 'ORDER-' + Date.now(),
        userId: user.id,
        eventId: event.id,
        ticketQuantity: 1, // Assuming 1 ticket
        pricePerTicket: event.pricePerTicket,
        totalPrice,
        billingDetails: null, // Not provided in new DTO
        address: null, // Not provided in new DTO
        paymentConfirmationId,
        status: TicketPurchaseStatus.CONFIRMED,
        transactionDate: new Date(),
        type: 'initial', // Differentiate type
        sessions: [],
      };
      this.purchases.push(purchase);

      // Potentially trigger NFT minting for initial sale if event is configured for it
      // This would involve checking NftMintingConfig for the event and calling nftTicketsService.mintNftTicket
      // For now, we'll assume a simple purchase record.

      // Generate receipt
      return {
        receiptId: purchase.id,
        user: {
          fullName: user.fullName,
          email: user.email,
        },
        event: {
          name: event.name,
          date: event.date.toISOString(),
          location: event.location,
        },
        ticket: {
          quantity: purchase.ticketQuantity,
          pricePerTicket: purchase.pricePerTicket,
          totalPrice: purchase.totalPrice,
          type: purchase.type,
          sessions: purchase.sessions,
        },
        totalAmountPaid: purchase.totalPrice,
        transactionDate: purchase.transactionDate.toISOString(),
      };
    }
  }
  }

  async getReceipt(orderId: string, userId: string): Promise<ReceiptDto> {
    const purchase = this.purchases.find(p => p.id === orderId && p.userId === userId);
    if (!purchase) throw new NotFoundException('Receipt not found');
    const user = this.users.find(u => u.id === purchase.userId);
    const event = this.events.find(e => e.id === purchase.eventId);
    return {
      receiptId: purchase.id,
      user: {
        fullName: user?.fullName || '',
        email: user?.email || '',
      },
      event: {
        name: event?.name || '',
        date: event?.date?.toISOString() || '',
        location: event?.location || '',
      },
      ticket: {
        quantity: purchase.ticketQuantity,
        pricePerTicket: purchase.pricePerTicket,
        totalPrice: purchase.totalPrice,
        type: purchase.type,
        sessions: purchase.sessions,
      },
      totalAmountPaid: purchase.totalPrice,
      transactionDate: purchase.transactionDate.toISOString(),
    };
  }
}