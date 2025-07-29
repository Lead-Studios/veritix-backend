import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { ReceiptDto } from './dto/receipt.dto';
import { TicketPurchase } from './entity/ticket.entity';
import { PaymentService } from './payment.service';
import { Event } from './interfaces/event.interface';
import { User } from './interfaces/user.interface';
import { TicketPurchaseStatus } from './enums/ticket-purchase-status.enum';

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

  constructor(private readonly paymentService: PaymentService) {}

  async applyPromoCode(eventId: string, code: string) {
    // For demo: always 10% off if code is 'PROMO10' and event matches
    if (code === 'PROMO10') {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) throw new BadRequestException('Event not found');
      return { valid: true, discount: 0.1 };
    }
    throw new BadRequestException('Invalid promo code');
  }

  async purchaseTickets(
    userId: string,
    dto: PurchaseTicketDto,
  ): Promise<ReceiptDto> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('User not found');
    const event = this.events.find((e) => e.id === dto.eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (dto.ticketQuantity > event.availableTickets) {
      throw new BadRequestException('Not enough tickets available');
    }
    let discount = 0;
    if (dto.promoCode) {
      try {
        const promo = await this.applyPromoCode(dto.eventId, dto.promoCode);
        discount = promo.discount;
      } catch (e) {
        throw new BadRequestException('Invalid or expired promo code');
      }
    }
    let totalPrice = event.pricePerTicket * dto.ticketQuantity;
    if (discount > 0) {
      totalPrice = totalPrice * (1 - discount);
    }
    // Process payment
    const paymentConfirmationId = await this.paymentService.processPayment(
      dto.paymentToken,
      totalPrice,
    );
    // Update event ticket inventory
    event.availableTickets -= dto.ticketQuantity;
    // Conference/session ticketing logic
    let ticketInfo = {};
    if (dto.ticketType === 'conference') {
      ticketInfo = { type: 'conference', sessions: 'all' };
    } else if (dto.ticketType === 'session') {
      if (!dto.sessionIds || !dto.sessionIds.length) {
        throw new BadRequestException(
          'Session IDs required for session ticket',
        );
      }
      ticketInfo = { type: 'session', sessions: dto.sessionIds };
    }
    // Create purchase record
    const purchase: TicketPurchase = {
      id: 'ORDER-' + Date.now(),
      userId: user.id,
      eventId: event.id,
      ticketQuantity: dto.ticketQuantity,
      pricePerTicket: event.pricePerTicket,
      totalPrice,
      billingDetails: dto.billingDetails,
      address: dto.address,
      paymentConfirmationId,
      status: TicketPurchaseStatus.CONFIRMED,
      transactionDate: new Date(),
      ...ticketInfo,
    };
    this.purchases.push(purchase);
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

  async getReceipt(orderId: string, userId: string): Promise<ReceiptDto> {
    const purchase = this.purchases.find(
      (p) => p.id === orderId && p.userId === userId,
    );
    if (!purchase) throw new NotFoundException('Receipt not found');
    const user = this.users.find((u) => u.id === purchase.userId);
    const event = this.events.find((e) => e.id === purchase.eventId);
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
