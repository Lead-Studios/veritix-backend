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
    };
  }
}
