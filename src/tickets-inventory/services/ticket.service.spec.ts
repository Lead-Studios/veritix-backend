import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
  });
});
