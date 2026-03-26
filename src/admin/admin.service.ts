import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
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
import { AuditLogService } from './services/audit-log.service';
import { AdminAuditAction } from './entities/admin-audit-log.entity';
import { PaginatedAdminAuditLogResponseDto } from './dto/admin-audit-log.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async listUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.search) {
      qb.andWhere('LOWER(user.email) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      items: users.map((user) => this.serializeUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUserDetails(id: number) {
    const user = await this.findUserOrFail(id);
    const ticketCount = await this.ticketRepository.count({
      where: { ownerId: user.id },
    });

    return {
      ...this.serializeUser(user),
      suspensionReason: user.suspensionReason ?? null,
      suspendedAt: user.suspendedAt ?? null,
      tokenVersion: user.tokenVersion,
      ticketCount,
      orderCount: 0,
    };
  }

  async updateUserRole(actorId: number, userId: number, role: UserRole) {
    const user = await this.findUserOrFail(userId);

    this.assertAdminMutationAllowed(actorId, user);

    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot promote a user to ADMIN');
    }

    user.role = role;
    await this.userRepository.save(user);

    return {
      message: 'User role updated successfully',
      user: this.serializeUser(user),
    };
  }

  async suspendUser(actorId: number, userId: number, reason: string) {
    const user = await this.findUserOrFail(userId);

    this.assertAdminMutationAllowed(actorId, user);

    user.isSuspended = true;
    user.suspensionReason = reason;
    user.suspendedAt = new Date();
    user.tokenVersion += 1;

    await this.userRepository.save(user);

    return {
      message: 'User suspended successfully',
      user: this.serializeUser(user),
    };
  }

  async unsuspendUser(actorId: number, userId: number) {
    const user = await this.findUserOrFail(userId);

    this.assertAdminMutationAllowed(actorId, user);

    user.isSuspended = false;
    user.suspensionReason = null;
    user.suspendedAt = null;
    user.tokenVersion += 1;

    await this.userRepository.save(user);

    return {
      message: 'User unsuspended successfully',
      user: this.serializeUser(user),
    };
  }

  private async findUserOrFail(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private assertAdminMutationAllowed(actorId: number, target: User) {
    if (target.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot modify another ADMIN user');
    }

    if (actorId === target.id) {
      throw new ForbiddenException('Cannot modify your own admin account');
    }
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    private readonly userRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly auditLogService: AuditLogService,
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

  async getAuditLog(options: {
    page?: number;
    limit?: number;
    action?: AdminAuditAction;
  }): Promise<PaginatedAdminAuditLogResponseDto> {
    return this.auditLogService.findPaginated(options);
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
