import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from './enums/order-status.enum';
import { OrdersScheduler } from './orders.scheduler';
import { TicketTypeService } from 'src/tickets-inventory/services/ticket-type.service';
import { Order } from './orders.entity';

const makeItem = (ticketTypeId: string, quantity: number) => ({
  id: `item-${ticketTypeId}`,
  quantity,
  ticketType: { id: ticketTypeId },
});

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 'order-uuid-1',
    status: OrderStatus.PENDING,
    expiresAt: new Date('2024-06-01T00:00:00Z'), // always in the past
    items: [makeItem('tt-uuid-1', 2)],
    ...overrides,
  } as unknown as Order);

const mockOrderRepo = () => ({
  find: jest.fn(),
  update: jest.fn(),
});

const mockTicketTypeService = () => ({
  releaseTickets: jest.fn(),
});

const mockConfigService = (expiryMinutes = 15) => ({
  get: jest.fn().mockReturnValue({ expiryMinutes }),
});

describe('OrdersScheduler', () => {
  let scheduler: OrdersScheduler;
  let orderRepo: ReturnType<typeof mockOrderRepo>;
  let ticketTypeService: ReturnType<typeof mockTicketTypeService>;
  let configService: ReturnType<typeof mockConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersScheduler,
        { provide: getRepositoryToken(Order), useFactory: mockOrderRepo },
        { provide: TicketTypeService, useFactory: mockTicketTypeService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    scheduler = module.get(OrdersScheduler);
    orderRepo = module.get(getRepositoryToken(Order));
    ticketTypeService = module.get(TicketTypeService);
    configService = module.get(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleOrderExpiry', () => {
    it('cancels expired orders and releases inventory', async () => {
      const order = makeOrder({ items: [makeItem('tt-1', 3), makeItem('tt-2', 1)] });
      orderRepo.find.mockResolvedValue([order]);
      orderRepo.update.mockResolvedValue({ affected: 1 });
      ticketTypeService.releaseTickets.mockResolvedValue(undefined);

      const summary = await scheduler.handleOrderExpiry();

      expect(ticketTypeService.releaseTickets).toHaveBeenCalledWith('tt-1', 3);
      expect(ticketTypeService.releaseTickets).toHaveBeenCalledWith('tt-2', 1);
      expect(orderRepo.update).toHaveBeenCalledWith(order.id, {
        status: OrderStatus.CANCELLED,
      });
      expect(summary.expiredCount).toBe(1);
      expect(summary.ticketsReleased).toBe(4);
      expect(summary.failedOrderIds).toHaveLength(0);
    });

    it('processes multiple expired orders and sums ticket counts', async () => {
      const orders = [
        makeOrder({ id: 'order-1', items: [makeItem('tt-1', 2)] }),
        makeOrder({ id: 'order-2', items: [makeItem('tt-2', 5)] }),
      ];
      orderRepo.find.mockResolvedValue(orders);
      orderRepo.update.mockResolvedValue({ affected: 1 });
      ticketTypeService.releaseTickets.mockResolvedValue(undefined);

      const summary = await scheduler.handleOrderExpiry();

      expect(summary.expiredCount).toBe(2);
      expect(summary.ticketsReleased).toBe(7);
      expect(ticketTypeService.releaseTickets).toHaveBeenCalledTimes(2);
    });

    it('returns zero counts and skips DB writes when no expired orders', async () => {
      orderRepo.find.mockResolvedValue([]);

      const summary = await scheduler.handleOrderExpiry();

      expect(summary.expiredCount).toBe(0);
      expect(summary.ticketsReleased).toBe(0);
      expect(orderRepo.update).not.toHaveBeenCalled();
      expect(ticketTypeService.releaseTickets).not.toHaveBeenCalled();
    });

    it('handles orders with no line items (releases 0 tickets)', async () => {
      const order = makeOrder({ items: [] });
      orderRepo.find.mockResolvedValue([order]);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      const summary = await scheduler.handleOrderExpiry();

      expect(ticketTypeService.releaseTickets).not.toHaveBeenCalled();
      expect(orderRepo.update).toHaveBeenCalledWith(order.id, {
        status: OrderStatus.CANCELLED,
      });
      expect(summary.ticketsReleased).toBe(0);
      expect(summary.expiredCount).toBe(1);
    });
  });

  describe('error isolation', () => {
    it('continues processing remaining orders when one fails', async () => {
      const failing = makeOrder({ id: 'order-fail', items: [makeItem('tt-bad', 2)] });
      const passing = makeOrder({ id: 'order-ok', items: [makeItem('tt-good', 3)] });
      orderRepo.find.mockResolvedValue([failing, passing]);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      // First call throws, second succeeds
      ticketTypeService.releaseTickets
        .mockRejectedValueOnce(new Error('inventory service unavailable'))
        .mockResolvedValueOnce(undefined);

      const summary = await scheduler.handleOrderExpiry();

      expect(summary.failedOrderIds).toContain('order-fail');
      expect(summary.expiredCount).toBe(1);   // only the passing order counted
      expect(summary.ticketsReleased).toBe(3); // only tickets from passing order
    });

    it('records all failing order IDs in the summary', async () => {
      const orders = [
        makeOrder({ id: 'order-1' }),
        makeOrder({ id: 'order-2' }),
        makeOrder({ id: 'order-3' }),
      ];
      orderRepo.find.mockResolvedValue(orders);
      ticketTypeService.releaseTickets.mockRejectedValue(new Error('boom'));

      const summary = await scheduler.handleOrderExpiry();

      expect(summary.failedOrderIds).toEqual(
        expect.arrayContaining(['order-1', 'order-2', 'order-3']),
      );
      expect(summary.expiredCount).toBe(0);
      expect(orderRepo.update).not.toHaveBeenCalled();
    });

    it('does not cancel an order when releaseTickets throws', async () => {
      const order = makeOrder({ items: [makeItem('tt-1', 1)] });
      orderRepo.find.mockResolvedValue([order]);
      ticketTypeService.releaseTickets.mockRejectedValue(new Error('timeout'));

      await scheduler.handleOrderExpiry();

      // Status update must NOT have been called — order stays PENDING for retry
      expect(orderRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('computeExpiresAt', () => {
    it('returns now + configured minutes', () => {
      configService.get.mockReturnValue({ expiryMinutes: 20 });

      const from = new Date('2024-06-15T10:00:00.000Z');
      const result = scheduler.computeExpiresAt(from);

      expect(result.toISOString()).toBe('2024-06-15T10:20:00.000Z');
    });

    it('defaults to 15 minutes when config returns null', () => {
      configService.get.mockReturnValue(null);

      const from = new Date('2024-06-15T10:00:00.000Z');
      const result = scheduler.computeExpiresAt(from);

      expect(result.toISOString()).toBe('2024-06-15T10:15:00.000Z');
    });

    it('uses current time when no base date is provided', () => {
      configService.get.mockReturnValue({ expiryMinutes: 15 });

      const before = Date.now();
      const result = scheduler.computeExpiresAt();
      const after = Date.now();

      const expectedMin = before + 15 * 60 * 1000;
      const expectedMax = after + 15 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('findExpiredOrders', () => {
    it('queries only PENDING orders with expiresAt before asOf', async () => {
      orderRepo.find.mockResolvedValue([]);
      const asOf = new Date('2024-06-15T12:00:00Z');

      await scheduler.findExpiredOrders(asOf);

      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.PENDING }),
          relations: ['items', 'items.ticketType'],
        }),
      );
    });
  });
});