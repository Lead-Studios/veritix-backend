import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { Order } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './entities/audit-log.entity';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  // ── #610 User Management ──────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search?: string, role?: UserRole) {
    const qb = this.userRepo.createQueryBuilder('user').where('user.deletedAt IS NULL');
    if (search) {
      qb.andWhere('(user.email ILIKE :s OR user.fullName ILIKE :s)', { s: `%${search}%` });
    }
    if (role) qb.andWhere('user.role = :role', { role });
    const [data, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserDetail(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const [orderCount, ticketCount] = await Promise.all([
      this.orderRepo.count({ where: { userId: id } }),
      this.ticketRepo.count({ where: { userId: id } }),
    ]);
    return { ...user, orderCount, ticketCount };
  }

  async updateRole(actor: User, targetId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot promote user to ADMIN');
    }
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');
    const prev = user.role;
    user.role = role;
    await this.userRepo.save(user);
    await this.auditLog.log(actor.id, actor.email, AuditAction.ROLE_CHANGE, 'User', targetId, {
      from: prev,
      to: role,
    });
    return user;
  }

  // ── #611 User Suspension ──────────────────────────────────────────────────

  async suspendUser(actor: User, targetId: string, reason: string) {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot suspend an ADMIN');
    }
    user.suspendedAt = new Date();
    user.suspensionReason = reason;
    user.tokenVersion += 1;
    await this.userRepo.save(user);
    await this.auditLog.log(actor.id, actor.email, AuditAction.USER_SUSPENDED, 'User', targetId, {
      reason,
    });
    return { message: 'User suspended' };
  }

  async unsuspendUser(actor: User, targetId: string) {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');
    user.suspendedAt = null;
    user.suspensionReason = null;
    await this.userRepo.save(user);
    await this.auditLog.log(
      actor.id,
      actor.email,
      AuditAction.USER_UNSUSPENDED,
      'User',
      targetId,
    );
    return { message: 'User unsuspended' };
  }

  // ── #613 Event Management ─────────────────────────────────────────────────

  async listAllEvents(page = 1, limit = 20, status?: EventStatus) {
    const qb = this.eventRepo.createQueryBuilder('event').orderBy('event.createdAt', 'DESC');
    if (status) qb.where('event.status = :status', { status });
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveEvent(actor: User, eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT events can be approved');
    }
    event.status = EventStatus.PUBLISHED;
    await this.eventRepo.save(event);
    await this.auditLog.log(actor.id, actor.email, AuditAction.EVENT_APPROVED, 'Event', eventId);
    await this.emailService.sendEmail({
      to: event.organizer.email,
      subject: 'Your event has been approved — Veritix',
      html: `<p>Hi ${event.organizer.fullName}, your event <strong>${event.title}</strong> has been approved and is now published.</p>`,
    });
    return event;
  }

  async rejectEvent(actor: User, eventId: string, reason: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });
    if (!event) throw new NotFoundException('Event not found');
    event.status = EventStatus.DRAFT;
    await this.eventRepo.save(event);
    await this.auditLog.log(actor.id, actor.email, AuditAction.EVENT_REJECTED, 'Event', eventId, {
      reason,
    });
    await this.emailService.sendEmail({
      to: event.organizer.email,
      subject: 'Your event was not approved — Veritix',
      html: `<p>Hi ${event.organizer.fullName}, your event <strong>${event.title}</strong> was rejected. Reason: ${reason}</p>`,
    });
    return event;
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
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketType } from '../ticket-types/entities/ticket-type.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { StellarService } from '../stellar/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stellarService: StellarService,
  ) {}

  // Issue #614 — POST /admin/orders/:id/refund
  async refundOrder(orderId: string, reason: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.PAID)
      throw new BadRequestException(`Order is not PAID (status: ${order.status})`);

    for (const ticket of order.tickets ?? []) {
      await this.ticketRepo.update(ticket.id, { status: 'CANCELLED' });
      await this.ticketTypeRepo.increment({ id: ticket.ticketTypeId }, 'soldQuantity', -1);
    }

    let refundTxHash: string | null = null;
    if (order.stellarTxHash) {
      const user = await this.userRepo.findOne({ where: { id: order.userId } });
      if (user?.stellarWalletAddress) {
        refundTxHash = await this.sendStellarRefund(
          user.stellarWalletAddress,
          order.totalAmountXLM,
          `refund:${order.stellarMemo}`,
        );
      }
    }

    await this.orderRepo.update(orderId, { status: OrderStatus.REFUNDED, refundTxHash });
    return { orderId, status: OrderStatus.REFUNDED, refundTxHash, reason };
  }

  private async sendStellarRefund(
    destination: string,
    amount: number,
    memo: string,
  ): Promise<string | null> {
    try {
      const server = this.stellarService.getServer();
      const secretKey = process.env.STELLAR_SECRET;
      if (!secretKey) return null;

      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.stellarService.getNetworkPassphrase(),
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset: StellarSdk.Asset.native(),
            amount: amount.toFixed(7),
          }),
        )
        .addMemo(StellarSdk.Memo.text(memo.substring(0, 28)))
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);
      const result = await server.submitTransaction(tx);
      return result.hash;
    } catch {
      return null;
    }
  }

  // Issue #615 — GET /admin/events/:id/analytics
  async getEventAnalytics(eventId: string) {
    const ticketTypes = await this.ticketTypeRepo.find({ where: { eventId } });
    if (!ticketTypes.length) throw new NotFoundException(`Event ${eventId} not found`);

    const salesByType = ticketTypes.map((tt) => ({
      name: tt.name,
      sold: tt.soldQuantity,
      remaining: tt.totalQuantity - tt.soldQuantity,
    }));

    const totalRevenue = ticketTypes.reduce(
      (sum, tt) => sum + Number(tt.price) * tt.soldQuantity,
      0,
    );

    const tickets = await this.ticketRepo.find({ where: { eventId } });
    const totalScanned = tickets.filter((t) => t.status === 'USED').length;
    const scanRate = tickets.length ? Math.round((totalScanned / tickets.length) * 100) : 0;

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const velocity: Record<string, number> = {};
    for (const ticket of tickets) {
      if (ticket.createdAt >= since) {
        const day = ticket.createdAt.toISOString().split('T')[0];
        velocity[day] = (velocity[day] ?? 0) + 1;
      }
    }

    return {
      eventId,
      salesByType,
      totalRevenueUSD: totalRevenue,
      scanStats: { totalScanned, scanRate },
      salesVelocity: Object.entries(velocity)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // Issue #616 — GET /admin/stellar/transactions
  async getRecentTransactions(limit = 20) {
    const clampedLimit = Math.min(50, Math.max(1, limit));
    const address = this.stellarService.getReceivingAddress();
    if (!address) throw new BadRequestException('STELLAR_RECEIVING_ADDRESS not configured');

    const server = this.stellarService.getServer();
    const records = await server
      .transactions()
      .forAccount(address)
      .limit(clampedLimit)
      .order('desc')
      .call();

    const txs = await Promise.all(
      records.records.map(async (tx) => {
        const memo = tx.memo ?? null;
        let matchedOrderId: string | null = null;

        if (memo) {
          const order = await this.orderRepo.findOne({
            where: { stellarMemo: memo },
            select: ['id'],
          });
          matchedOrderId = order?.id ?? null;
        }

        const ops = await tx.operations();
        const paymentOp = ops.records.find((op) => op.type === 'payment') as
          | { from: string; amount: string }
          | undefined;

        return {
          txHash: tx.hash,
          from: paymentOp?.from ?? null,
          memo,
          amount: paymentOp?.amount ?? null,
          confirmedAt: tx.created_at,
          matchedOrderId,
        };
      }),
    );

    return txs;
  }
}
