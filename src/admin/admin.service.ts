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
  }
}
