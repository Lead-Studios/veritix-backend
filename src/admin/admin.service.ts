import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../enums/event-status.enum';
import {
  Ticket,
  TicketStatus,
} from '../tickets-inventory/entities/ticket.entity';
import { Order } from '../orders/orders.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  AdminStatsResponseDto,
  EventStats,
  OrderStats,
  TicketStats,
  UserStats,
} from './dto/admin-stats.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getStats(): Promise<AdminStatsResponseDto> {
    const [users, events, tickets, orders] = await Promise.all([
      this.getUserStats(),
      this.getEventStats(),
      this.getTicketStats(),
      this.getOrderStats(),
    ]);

    return {
      users,
      events,
      tickets,
      orders,
      generatedAt: new Date().toISOString(),
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers — each runs its own aggregate queries in parallel
  // -----------------------------------------------------------------------

  private async getUserStats(): Promise<UserStats> {
    const [totalResult, verifiedResult, roleResult] = await Promise.all([
      // Total user count
      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(u.id)', 'count')
        .getRawOne<{ count: string }>(),

      // Verified users
      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(u.id)', 'count')
        .where('u.isVerified = :v', { v: true })
        .getRawOne<{ count: string }>(),

      // Group by role
      this.userRepo
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(u.id)', 'count')
        .groupBy('u.role')
        .getRawMany<{ role: string; count: string }>(),
    ]);

    const byRole = roleResult.reduce(
      (acc, row) => {
        acc[row.role.toLowerCase() as keyof typeof acc] = Number(row.count);
        return acc;
      },
      { subscriber: 0, organizer: 0, admin: 0 },
    );

    return {
      total: Number(totalResult?.count ?? 0),
      verified: Number(verifiedResult?.count ?? 0),
      byRole,
    };
  }

  private async getEventStats(): Promise<EventStats> {
    const [totalResult, statusResult] = await Promise.all([
      this.eventRepo
        .createQueryBuilder('e')
        .select('COUNT(e.id)', 'count')
        .getRawOne<{ count: string }>(),

      this.eventRepo
        .createQueryBuilder('e')
        .select('e.status', 'status')
        .addSelect('COUNT(e.id)', 'count')
        .groupBy('e.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const byStatus = statusResult.reduce(
      (acc, row) => {
        acc[row.status.toLowerCase() as keyof typeof acc] = Number(row.count);
        return acc;
      },
      {
        [EventStatus.DRAFT.toLowerCase()]: 0,
        [EventStatus.PUBLISHED.toLowerCase()]: 0,
        [EventStatus.CANCELLED.toLowerCase()]: 0,
        [EventStatus.COMPLETED.toLowerCase()]: 0,
        [EventStatus.POSTPONED.toLowerCase()]: 0,
      } as Record<string, number>,
    );

    return {
      total: Number(totalResult?.count ?? 0),
      byStatus: {
        draft: byStatus['draft'] ?? 0,
        published: byStatus['published'] ?? 0,
        cancelled: byStatus['cancelled'] ?? 0,
        completed: byStatus['completed'] ?? 0,
        postponed: byStatus['postponed'] ?? 0,
      },
    };
  }

  private async getTicketStats(): Promise<TicketStats> {
    const [totalResult, statusResult] = await Promise.all([
      this.ticketRepo
        .createQueryBuilder('t')
        .select('COUNT(t.id)', 'count')
        .getRawOne<{ count: string }>(),

      this.ticketRepo
        .createQueryBuilder('t')
        .select('t.status', 'status')
        .addSelect('COUNT(t.id)', 'count')
        .groupBy('t.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const byStatus = statusResult.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total: Number(totalResult?.count ?? 0),
      issued: byStatus[TicketStatus.ISSUED] ?? 0,
      scanned: byStatus[TicketStatus.SCANNED] ?? 0,
      refunded: byStatus[TicketStatus.REFUNDED] ?? 0,
      cancelled: byStatus[TicketStatus.CANCELLED] ?? 0,
    };
  }

  private async getOrderStats(): Promise<OrderStats> {
    const [totalResult, statusResult, revenueResult] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(o.id)', 'count')
        .getRawOne<{ count: string }>(),

      this.orderRepo
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(o.id)', 'count')
        .groupBy('o.status')
        .getRawMany<{ status: string; count: string }>(),

      // Revenue: sum totalAmountXLM for PAID orders only
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.totalAmountXLM), 0)', 'revenue')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ revenue: string }>(),
    ]);

    const byStatus = statusResult.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total: Number(totalResult?.count ?? 0),
      paid: byStatus[OrderStatus.PAID] ?? 0,
      pending: byStatus[OrderStatus.PENDING] ?? 0,
      failed: byStatus[OrderStatus.FAILED] ?? 0,
      refunded: byStatus[OrderStatus.REFUNDED] ?? 0,
      totalRevenueXLM: revenueResult?.revenue ?? '0',
    };
  }
}
