import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketService } from './ticket.service';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketTypeService } from './ticket-type.service';
import { Order } from '../../orders/orders.entity';
import { StellarService } from '../../stellar/stellar.service';
import { QRService } from '../qr.service';
import { UserRole } from '../../auth/common/enum/user-role-enum';

describe('TicketService', () => {
  let service: TicketService;

  const mockTicketRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockTicketTypeService = {
    findByIdEntity: jest.fn(),
    reserveTickets: jest.fn(),
    releaseTickets: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockStellarService = {
    sendRefund: jest.fn(),
  };

  const mockQrService = {
    generateQRDataURI: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepository },
        { provide: TicketTypeService, useValue: mockTicketTypeService },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: StellarService, useValue: mockStellarService },
        { provide: QRService, useValue: mockQrService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelTicket', () => {
    it('allows an organizer to cancel a ticket for their own event', async () => {
      const cancelledAt = new Date('2026-03-25T12:00:00.000Z');
      const ticket = {
        id: 'ticket-1',
        qrCode: 'qr-1',
        qrCodeImage: null,
        status: TicketStatus.ISSUED,
        orderReference: null,
        attendeeEmail: 'buyer@example.com',
        attendeeName: 'Buyer',
        metadata: null,
        ticketTypeId: 'type-1',
        eventId: 'event-1',
        scannedAt: null,
        refundedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date('2026-03-24T12:00:00.000Z'),
        updatedAt: new Date('2026-03-24T12:00:00.000Z'),
        event: {
          id: 'event-1',
          organizerId: 'organizer-1',
        },
        markAsCancelled: jest.fn(function (this: any, reason?: string) {
          this.status = TicketStatus.CANCELLED;
          this.cancelledAt = cancelledAt;
          this.cancellationReason = reason ?? null;
        }),
      } as unknown as Ticket;

      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketTypeService.releaseTickets.mockResolvedValue(undefined);
      mockTicketRepository.save.mockImplementation(
        async (entity: Ticket) => entity,
      );

      const result = await service.cancelTicket(
        'ticket-1',
        {
          id: 'organizer-1',
          role: UserRole.ORGANIZER,
        } as any,
        'Fraudulent purchase',
      );

      expect(mockTicketTypeService.releaseTickets).toHaveBeenCalledWith(
        'type-1',
        1,
      );
      expect(ticket.markAsCancelled).toHaveBeenCalledWith(
        'Fraudulent purchase',
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'ticket.cancelled',
        expect.objectContaining({
          ticketId: 'ticket-1',
          eventId: 'event-1',
          ticketTypeId: 'type-1',
          cancellationReason: 'Fraudulent purchase',
          cancelledBy: 'organizer-1',
        }),
      );
      expect(result.status).toBe(TicketStatus.CANCELLED);
      expect(result.cancelledAt).toBe(cancelledAt);
      expect(result.cancellationReason).toBe('Fraudulent purchase');
    });

    it('rejects a subscriber trying to cancel a ticket', async () => {
      mockTicketRepository.findOne.mockResolvedValue({
        id: 'ticket-1',
        status: TicketStatus.ISSUED,
        ticketTypeId: 'type-1',
        eventId: 'event-1',
        event: {
          id: 'event-1',
          organizerId: 'organizer-1',
        },
      });

      await expect(
        service.cancelTicket(
          'ticket-1',
          {
            id: 'subscriber-1',
            role: UserRole.SUBSCRIBER,
          } as any,
          'Banned user',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockTicketTypeService.releaseTickets).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
