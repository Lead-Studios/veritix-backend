import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderItem } from './orders.entity';
import { Ticket } from 'src/tickets-inventory/entities/ticket.entity';
import { TicketTypeService } from 'src/tickets-inventory/services/ticket-type.service';
import { OrderStatus } from './enums/order-status.enum';
import { User } from 'src/auth/entities/user.entity';
import { UserRole } from 'src/auth/common/enum/user-role-enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderError, OrderErrorCode } from './dto/order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: any;
  let ticketRepo: any;
  let ticketTypeService: any;
  let configService: any;
  let dataSource: any;
  let entityManager: any;

  const mockUser: User = { id: 'user-1', role: UserRole.SUBSCRIBER } as any;
  const mockAdmin: User = { id: 'admin-1', role: UserRole.ADMIN } as any;

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    ticketRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    ticketTypeService = {
      findById: jest.fn(),
      reserveTickets: jest.fn(),
      releaseTickets: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue({ expiryMinutes: 15 }),
    };

    entityManager = {
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb) => cb(entityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepo },
        { provide: TicketTypeService, useValue: ticketTypeService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createInput = {
      userId: 'user-1',
      eventId: 'event-1',
      items: [{ ticketTypeId: 'tt-1', quantity: 2 }],
    };

    it('should create an order successfully', async () => {
      const mockTicketType = { id: 'tt-1', price: 10, totalQuantity: 10 };
      ticketTypeService.findById.mockResolvedValue(mockTicketType);
      
      const mockOrder = { id: 'order-1', ...createInput, status: OrderStatus.PENDING };
      entityManager.create.mockReturnValue(mockOrder);
      entityManager.save.mockResolvedValue(mockOrder);

      const result = await service.createOrder(createInput);

      expect(result.order).toBeDefined();
      expect(result.stellarMemo).toMatch(/^VTX-[a-f0-9]{10}$/);
      expect(ticketTypeService.reserveTickets).toHaveBeenCalledWith('tt-1', 2);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw if items are empty', async () => {
      await expect(
        service.createOrder({ ...createInput, items: [] }),
      ).rejects.toThrow(OrderError);
    });

    it('should throw if inventory is insufficient', async () => {
      const mockTicketType = { id: 'tt-1', price: 10, totalQuantity: 1 };
      ticketTypeService.findById.mockResolvedValue(mockTicketType);

      await expect(service.createOrder(createInput)).rejects.toThrow(
        'Insufficient inventory',
      );
    });
  });

  describe('findById', () => {
    const mockOrder = { id: 'order-1', userId: 'user-1', status: OrderStatus.PENDING } as Order;

    it('should return order if user is the owner', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1', mockUser);
      expect(result).toEqual(mockOrder);
    });

    it('should return order if user is an ADMIN', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1', mockAdmin);
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('order-99', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner or ADMIN', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);
      const otherUser = { id: 'user-2', role: UserRole.SUBSCRIBER } as User;

      await expect(service.findById('order-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getOrderTickets', () => {
    const mockOrder = { id: 'order-1', userId: 'user-1' } as Order;
    const mockTickets = [
      {
        id: 't-1',
        qrCode: 'qr-1',
        attendeeName: 'Alice',
        ticketType: { name: 'VIP' },
        event: { title: 'Concert', eventDate: new Date() },
      },
    ];

    it('should return ticket summaries if user is authorized', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);
      ticketRepo.find.mockResolvedValue(mockTickets);

      const result = await service.getOrderTickets('order-1', mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].attendeeName).toBe('Alice');
      expect(result[0].ticketTypeName).toBe('VIP');
      expect(ticketRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderReference: 'order-1' } }),
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);
      const otherUser = { id: 'user-2', role: UserRole.SUBSCRIBER } as User;

      await expect(
        service.getOrderTickets('order-1', otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      items: [{ ticketTypeId: 'tt-1', quantity: 2 }],
    } as any;

    it('should cancel order and release inventory successfully', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.cancel('order-1', mockUser);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(entityManager.update).toHaveBeenCalledWith(Order, 'order-1', {
        status: OrderStatus.CANCELLED,
      });
      expect(ticketTypeService.releaseTickets).toHaveBeenCalledWith(
        'tt-1',
        2,
        undefined, // in mock transaction manager.queryRunner might be undefined unless mocked
      );
    });

    it('should throw BadRequestException if status is not PENDING', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      await expect(service.cancel('order-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if wrong user tries to cancel', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);
      const otherUser = { id: 'user-2', role: UserRole.SUBSCRIBER } as User;

      await expect(service.cancel('order-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
