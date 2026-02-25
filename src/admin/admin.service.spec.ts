import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets-inventory/entities/ticket.entity';
import { Order } from '../orders/orders.entity';

// -----------------------------------------------------------------------
// Helpers to build a chainable QueryBuilder mock
// -----------------------------------------------------------------------
const makeQbMock = (rawResult: any) => {
  const qb: any = {};
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.groupBy = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue(rawResult);
  qb.getRawMany = jest.fn().mockResolvedValue(rawResult);
  return qb;
};

const makeRepoMock = (defaultRaw: any = { count: '0' }) => ({
  createQueryBuilder: jest.fn().mockReturnValue(makeQbMock(defaultRaw)),
});

describe('AdminService', () => {
  let service: AdminService;
  let userRepoMock: ReturnType<typeof makeRepoMock>;
  let eventRepoMock: ReturnType<typeof makeRepoMock>;
  let ticketRepoMock: ReturnType<typeof makeRepoMock>;
  let orderRepoMock: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    userRepoMock = makeRepoMock();
    eventRepoMock = makeRepoMock();
    ticketRepoMock = makeRepoMock();
    orderRepoMock = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: getRepositoryToken(Event), useValue: eventRepoMock },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepoMock },
        { provide: getRepositoryToken(Order), useValue: orderRepoMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  // -----------------------------------------------------------------------
  // getStats — shape and generatedAt
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return an object with all top-level keys', async () => {
      // Provide minimal valid responses for every internal query
      const countQb = makeQbMock({ count: '0' });
      const groupQb = makeQbMock([]);
      const revenueQb = makeQbMock({ revenue: '0' });

      // Each repo call alternates between total and group-by calls
      let userCall = 0;
      userRepoMock.createQueryBuilder.mockImplementation(() => {
        userCall++;
        return userCall === 1 ? countQb : userCall === 2 ? countQb : groupQb;
      });
      eventRepoMock.createQueryBuilder.mockReturnValue(countQb);
      ticketRepoMock.createQueryBuilder.mockReturnValue(countQb);
      let orderCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        orderCall++;
        return orderCall === 3 ? revenueQb : countQb;
      });

      const result = await service.getStats();

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('generatedAt');
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt,
      );
    });
  });

  // -----------------------------------------------------------------------
  // User stats
  // -----------------------------------------------------------------------
  describe('getUserStats', () => {
    it('should aggregate user counts correctly', async () => {
      let call = 0;
      userRepoMock.createQueryBuilder.mockImplementation(() => {
        call++;
        if (call === 1) return makeQbMock({ count: '42' }); // total
        if (call === 2) return makeQbMock({ count: '30' }); // verified
        return makeQbMock([
          // by role
          { role: 'SUBSCRIBER', count: '25' },
          { role: 'ORGANIZER', count: '10' },
          { role: 'ADMIN', count: '7' },
        ]);
      });

      // Trigger through getStats — fake the other repos
      const zeroQb = makeQbMock({ count: '0' });
      const emptyQb = makeQbMock([]);
      eventRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(zeroQb, { getRawMany: jest.fn().mockResolvedValue([]) }),
      );
      ticketRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(zeroQb, { getRawMany: jest.fn().mockResolvedValue([]) }),
      );
      let oCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        oCall++;
        if (oCall === 3) return makeQbMock({ revenue: '0' });
        return makeQbMock(oCall === 2 ? [] : { count: '0' });
      });

      const result = await service.getStats();

      expect(result.users.total).toBe(42);
      expect(result.users.verified).toBe(30);
      expect(result.users.byRole.subscriber).toBe(25);
      expect(result.users.byRole.organizer).toBe(10);
      expect(result.users.byRole.admin).toBe(7);
    });
  });

  // -----------------------------------------------------------------------
  // Event stats
  // -----------------------------------------------------------------------
  describe('getEventStats', () => {
    it('should aggregate event counts by status', async () => {
      // Zero out user / ticket / order repos
      const zeroQb = makeQbMock({ count: '0' });
      const emptyQb = makeQbMock([]);
      userRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(makeQbMock({ count: '0' }), {
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      ticketRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(zeroQb, { getRawMany: jest.fn().mockResolvedValue([]) }),
      );
      let oCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        oCall++;
        if (oCall === 3) return makeQbMock({ revenue: '0' });
        return makeQbMock(oCall === 2 ? [] : { count: '0' });
      });

      let eCall = 0;
      eventRepoMock.createQueryBuilder.mockImplementation(() => {
        eCall++;
        if (eCall === 1) return makeQbMock({ count: '15' });
        return makeQbMock([
          { status: 'DRAFT', count: '5' },
          { status: 'PUBLISHED', count: '7' },
          { status: 'CANCELLED', count: '2' },
          { status: 'COMPLETED', count: '1' },
          { status: 'POSTPONED', count: '0' },
        ]);
      });

      const result = await service.getStats();
      expect(result.events.total).toBe(15);
      expect(result.events.byStatus.draft).toBe(5);
      expect(result.events.byStatus.published).toBe(7);
      expect(result.events.byStatus.cancelled).toBe(2);
      expect(result.events.byStatus.completed).toBe(1);
      expect(result.events.byStatus.postponed).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Ticket stats
  // -----------------------------------------------------------------------
  describe('getTicketStats', () => {
    it('should aggregate ticket counts by status', async () => {
      const zeroQb = () => makeQbMock({ count: '0' });
      userRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(zeroQb(), {
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      eventRepoMock.createQueryBuilder.mockReturnValue(
        Object.assign(zeroQb(), {
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      let oCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        oCall++;
        if (oCall === 3) return makeQbMock({ revenue: '0' });
        return makeQbMock(oCall === 2 ? [] : { count: '0' });
      });

      let tCall = 0;
      ticketRepoMock.createQueryBuilder.mockImplementation(() => {
        tCall++;
        if (tCall === 1) return makeQbMock({ count: '100' });
        return makeQbMock([
          { status: 'issued', count: '60' },
          { status: 'scanned', count: '25' },
          { status: 'refunded', count: '10' },
          { status: 'cancelled', count: '5' },
        ]);
      });

      const result = await service.getStats();
      expect(result.tickets.total).toBe(100);
      expect(result.tickets.issued).toBe(60);
      expect(result.tickets.scanned).toBe(25);
      expect(result.tickets.refunded).toBe(10);
      expect(result.tickets.cancelled).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // Order stats
  // -----------------------------------------------------------------------
  describe('getOrderStats', () => {
    it('should aggregate order counts and sum revenue only for PAID orders', async () => {
      const zeroQb = () =>
        Object.assign(makeQbMock({ count: '0' }), {
          getRawMany: jest.fn().mockResolvedValue([]),
        });
      userRepoMock.createQueryBuilder.mockReturnValue(zeroQb());
      eventRepoMock.createQueryBuilder.mockReturnValue(zeroQb());
      ticketRepoMock.createQueryBuilder.mockReturnValue(zeroQb());

      let oCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        oCall++;
        if (oCall === 1) return makeQbMock({ count: '200' });
        if (oCall === 2)
          return makeQbMock([
            { status: 'PAID', count: '120' },
            { status: 'PENDING', count: '50' },
            { status: 'FAILED', count: '20' },
            { status: 'REFUNDED', count: '10' },
          ]);
        // Revenue query (call 3)
        return makeQbMock({ revenue: '9450.1234567' });
      });

      const result = await service.getStats();
      expect(result.orders.total).toBe(200);
      expect(result.orders.paid).toBe(120);
      expect(result.orders.pending).toBe(50);
      expect(result.orders.failed).toBe(20);
      expect(result.orders.refunded).toBe(10);
      expect(result.orders.totalRevenueXLM).toBe('9450.1234567');
    });

    it('should return totalRevenueXLM of "0" when no paid orders exist', async () => {
      const zeroQb = () =>
        Object.assign(makeQbMock({ count: '0' }), {
          getRawMany: jest.fn().mockResolvedValue([]),
        });
      userRepoMock.createQueryBuilder.mockReturnValue(zeroQb());
      eventRepoMock.createQueryBuilder.mockReturnValue(zeroQb());
      ticketRepoMock.createQueryBuilder.mockReturnValue(zeroQb());

      let oCall = 0;
      orderRepoMock.createQueryBuilder.mockImplementation(() => {
        oCall++;
        if (oCall === 3) return makeQbMock({ revenue: '0' });
        return makeQbMock(oCall === 2 ? [] : { count: '0' });
      });

      const result = await service.getStats();
      expect(result.orders.totalRevenueXLM).toBe('0');
    });
  });
});
