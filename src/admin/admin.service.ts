import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Order } from '../orders/entities/orders.entity';

@Injectable()
export class AdminService {
  private cache: { data: unknown; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async getStats() {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.data;
    }

    const [users, events, tickets, orders] = await Promise.all([
      this.userRepo
        .createQueryBuilder('u')
        .select([
          'COUNT(*) AS total',
          'SUM(CASE WHEN u."isVerified" = true THEN 1 ELSE 0 END) AS verified',
          'u.role AS role',
        ])
        .groupBy('u.role')
        .getRawMany(),
      this.eventRepo
        .createQueryBuilder('e')
        .select(['COUNT(*) AS total', 'e.status AS status'])
        .groupBy('e.status')
        .getRawMany(),
      this.ticketRepo
        .createQueryBuilder('t')
        .select(['COUNT(*) AS total', 't.status AS status'])
        .groupBy('t.status')
        .getRawMany(),
      this.orderRepo
        .createQueryBuilder('o')
        .select([
          'COUNT(*) AS total',
          'o.status AS status',
          'SUM(CASE WHEN o.status = \'PAID\' THEN CAST(o."totalAmountUSD" AS DECIMAL) ELSE 0 END) AS "totalRevenueUSD"',
        ])
        .groupBy('o.status')
        .getRawMany(),
    ]);

    const totalUsers = users.reduce((s, r) => s + Number(r.total), 0);
    const verifiedUsers = users.reduce((s, r) => s + Number(r.verified), 0);
    const usersByRole = Object.fromEntries(users.map((r) => [r.role, Number(r.total)]));

    const totalEvents = events.reduce((s, r) => s + Number(r.total), 0);
    const eventsByStatus = Object.fromEntries(events.map((r) => [r.status, Number(r.total)]));

    const totalTickets = tickets.reduce((s, r) => s + Number(r.total), 0);
    const ticketsByStatus = Object.fromEntries(tickets.map((r) => [r.status, Number(r.total)]));

    const totalOrders = orders.reduce((s, r) => s + Number(r.total), 0);
    const ordersByStatus = Object.fromEntries(orders.map((r) => [r.status, Number(r.total)]));
    const totalRevenueUSD = orders.reduce((s, r) => s + Number(r.totalRevenueUSD), 0);

    const data = {
      users: { total: totalUsers, verified: verifiedUsers, byRole: usersByRole },
      events: { total: totalEvents, byStatus: eventsByStatus },
      tickets: { total: totalTickets, byStatus: ticketsByStatus },
      orders: { total: totalOrders, byStatus: ordersByStatus, totalRevenueUSD },
    };

    this.cache = { data, expiresAt: now + 60_000 };
    return data;
  }
}
