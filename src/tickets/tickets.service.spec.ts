import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PaymentService } from './payment.service';
import { TicketPurchaseStatus } from './enums/ticket-purchase-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let paymentService: PaymentService;

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
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('should purchase tickets successfully', async () => {
    const dto = {
      eventId: 'event1',
      ticketQuantity: 1,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'tok',
    };
    const receipt = await service.purchaseTickets('user1', dto);
    expect(receipt).toHaveProperty('receiptId');
    expect(receipt.user.fullName).toBe('John Doe');
    expect(receipt.event.name).toBe('Concert A');
    expect(receipt.ticket.quantity).toBe(1);
  });

  it('should throw if user not found', async () => {
    const dto = {
      eventId: 'event1',
      ticketQuantity: 1,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'tok',
    };
    await expect(service.purchaseTickets('invalid', dto)).rejects.toThrow(NotFoundException);
  });

  it('should throw if event not found', async () => {
    const dto = {
      eventId: 'invalid',
      ticketQuantity: 1,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'tok',
    };
    await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(NotFoundException);
  });

  it('should throw if not enough tickets', async () => {
    const dto = {
      eventId: 'event1',
      ticketQuantity: 999,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'tok',
    };
    await expect(service.purchaseTickets('user1', dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw if payment fails', async () => {
    jest.spyOn(paymentService, 'processPayment').mockRejectedValueOnce(new Error('fail'));
    const dto = {
      eventId: 'event1',
      ticketQuantity: 1,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'fail',
    };
    await expect(service.purchaseTickets('user1', dto)).rejects.toThrow('fail');
  });

  it('should get receipt successfully', async () => {
    const dto = {
      eventId: 'event1',
      ticketQuantity: 1,
      billingDetails: { fullName: 'John Doe', email: 'john@example.com', phoneNumber: '123' },
      address: { country: 'A', state: 'B', city: 'C', street: 'D', postalCode: 'E' },
      paymentToken: 'tok',
    };
    const receipt = await service.purchaseTickets('user1', dto);
    const found = await service.getReceipt(receipt.receiptId, 'user1');
    expect(found.receiptId).toBe(receipt.receiptId);
  });

  it('should throw if receipt not found', async () => {
    await expect(service.getReceipt('invalid', 'user1')).rejects.toThrow(NotFoundException);
  });
}); 