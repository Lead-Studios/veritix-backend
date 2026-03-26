import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketService } from './ticket.service';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketTypeService } from './ticket-type.service';
import { Order } from '../../orders/orders.entity';
import { User } from '../../users/entities/event.entity';
import { StellarService } from '../../stellar/stellar.service';
import { QRService } from '../qr.service';
import { TicketType } from '../entities/ticket-type.entity';

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepository: jest.Mocked<Partial<Repository<Ticket>>>;
  let orderRepository: jest.Mocked<Partial<Repository<Order>>>;
  let userRepository: jest.Mocked<Partial<Repository<User>>>;
  let stellarService: { sendRefund: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let ticketManagerSave: jest.Mock;
  let orderManagerSave: jest.Mock;
  let ticketTypeManagerDecrement: jest.Mock;

  beforeEach(async () => {
    ticketRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    orderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userRepository = {
      findOne: jest.fn(),
    };

    ticketManagerSave = jest.fn();
    orderManagerSave = jest.fn();
    ticketTypeManagerDecrement = jest.fn();

    dataSource = {
      transaction: jest.fn(async (callback: (manager: any) => unknown) =>
        callback({
          getRepository: jest.fn((entity: unknown) => {
            if (entity === TicketType) {
              return { decrement: ticketTypeManagerDecrement };
            }
            if (entity === Order) {
              return { save: orderManagerSave };
            }
            if (entity === Ticket) {
              return { save: ticketManagerSave };
            }

            throw new Error('Unexpected repository');
          }),
        }),
      ),
    };

    stellarService = {
      sendRefund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: ticketRepository,
        },
        {
          provide: TicketTypeService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: StellarService,
          useValue: stellarService,
        },
        {
          provide: QRService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(TicketService);
  });

  it('refunds a Stellar-paid ticket and stores the refund hash', async () => {
    const ticket = {
      id: 'ticket-1',
      status: TicketStatus.ISSUED,
      orderReference: 'order-1',
      ticketTypeId: 'tt-1',
      ticketType: {
        id: 'tt-1',
        price: 12.5,
        soldQuantity: 3,
      },
    } as Ticket;
    const order = {
      id: 'order-1',
      userId: 'user-1',
      stellarTxHash: 'stellar-payment-hash',
      refundTxHash: null,
    } as Order;
    const user = {
      id: 'user-1',
      stellarWalletAddress: 'GDESTINATIONWALLETADDRESS0000000000000000000000000000001',
    } as User;

    ticketRepository.findOne?.mockResolvedValue(ticket);
    orderRepository.findOne?.mockResolvedValue(order);
    userRepository.findOne?.mockResolvedValue(user);
    stellarService.sendRefund.mockResolvedValue('refund-hash-123');
    ticketTypeManagerDecrement.mockResolvedValue({ affected: 1 });
    orderManagerSave.mockResolvedValue({ ...order, refundTxHash: 'refund-hash-123' });
    ticketManagerSave.mockImplementation(async (savedTicket: Ticket) => savedTicket);

    const result = await service.refundTicket('ticket-1');

    expect(stellarService.sendRefund).toHaveBeenCalledWith(
      user.stellarWalletAddress,
      '12.5',
      'order-1',
    );
    expect(orderManagerSave).toHaveBeenCalledWith({
      ...order,
      refundTxHash: 'refund-hash-123',
    });
    expect(result.status).toBe(TicketStatus.REFUNDED);
    expect(result.refundedAt).toBeInstanceOf(Date);
  });

  it('does not mark the ticket refunded when Stellar refund fails', async () => {
    const ticket = {
      id: 'ticket-1',
      status: TicketStatus.ISSUED,
      orderReference: 'order-1',
      ticketTypeId: 'tt-1',
      ticketType: {
        id: 'tt-1',
        price: 12.5,
        soldQuantity: 3,
      },
    } as Ticket;
    const order = {
      id: 'order-1',
      userId: 'user-1',
      stellarTxHash: 'stellar-payment-hash',
    } as Order;
    const user = {
      id: 'user-1',
      stellarWalletAddress: 'GDESTINATIONWALLETADDRESS0000000000000000000000000000001',
    } as User;

    ticketRepository.findOne?.mockResolvedValue(ticket);
    orderRepository.findOne?.mockResolvedValue(order);
    userRepository.findOne?.mockResolvedValue(user);
    stellarService.sendRefund.mockRejectedValue(new Error('Horizon unavailable'));

    await expect(service.refundTicket('ticket-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(ticket.status).toBe(TicketStatus.ISSUED);
  });

  it('rejects Stellar refunds when the user has no wallet address', async () => {
    const ticket = {
      id: 'ticket-1',
      status: TicketStatus.ISSUED,
      orderReference: 'order-1',
      ticketTypeId: 'tt-1',
      ticketType: {
        id: 'tt-1',
        price: 12.5,
        soldQuantity: 3,
      },
    } as Ticket;
    const order = {
      id: 'order-1',
      userId: 'user-1',
      stellarTxHash: 'stellar-payment-hash',
    } as Order;

    ticketRepository.findOne?.mockResolvedValue(ticket);
    orderRepository.findOne?.mockResolvedValue(order);
    userRepository.findOne?.mockResolvedValue({
      id: 'user-1',
      stellarWalletAddress: null,
    } as User);

    await expect(service.refundTicket('ticket-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stellarService.sendRefund).not.toHaveBeenCalled();
  });

  it('throws when the ticket does not exist', async () => {
    ticketRepository.findOne?.mockResolvedValue(null);

    await expect(service.refundTicket('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
import { StellarService } from '../../stellar/stellar.service';
import { QRService } from '../qr.service';
import { AuditLogService } from '../../admin/services/audit-log.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../admin/entities/admin-audit-log.entity';
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
        { provide: getRepositoryToken(Ticket), useValue: ticketRepositoryMock },
        { provide: TicketTypeService, useValue: ticketTypeServiceMock },
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: StellarService, useValue: stellarServiceMock },
        { provide: QRService, useValue: qrServiceMock },
        { provide: AuditLogService, useValue: auditLogServiceMock },
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

  afterEach(() => jest.clearAllMocks());

  describe('refundTicket', () => {
    it('creates an admin audit log entry for manual refunds', async () => {
      const ticket = {
        id: 'ticket-1',
        status: TicketStatus.ISSUED,
        orderReference: 'order-1',
        ticketTypeId: 'type-1',
        refundedAt: null,
        ticketType: {
          price: 50,
        },
      } as Ticket & { ticketType: { price: number } };

      const refundedOrder = {
        id: 'order-1',
        stellarTxHash: 'stellar-hash',
        buyerStellarAddress: 'GABC123',
        refundTxHash: 'refund-hash',
      };

      ticketRepositoryMock.findOne.mockResolvedValue(ticket);
      orderRepositoryMock.findOne
        .mockResolvedValueOnce(refundedOrder)
        .mockResolvedValueOnce(refundedOrder);
      stellarServiceMock.sendRefund.mockResolvedValue('refund-hash');
      orderRepositoryMock.save.mockResolvedValue(refundedOrder);
      ticketTypeServiceMock.releaseTickets.mockResolvedValue(undefined);
      ticketRepositoryMock.save.mockImplementation(
        async (entity: Ticket) => entity,
      );
      auditLogServiceMock.log.mockResolvedValue(undefined);

      const result = await service.refundTicket('ticket-1', 'admin-1');

      expect(result.status).toBe(TicketStatus.REFUNDED);
      expect(auditLogServiceMock.log).toHaveBeenCalledWith(
        'admin-1',
        AdminAuditAction.MANUAL_REFUND,
        AdminAuditTargetType.TICKET,
        'ticket-1',
        expect.objectContaining({
          orderReference: 'order-1',
          ticketTypeId: 'type-1',
          refundTxHash: 'refund-hash',
        }),
      );
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
