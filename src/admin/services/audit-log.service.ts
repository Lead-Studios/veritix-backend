import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import {
  AdminAuditAction,
  AdminAuditLog,
  AdminAuditTargetType,
} from '../entities/admin-audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly adminAuditLogRepository: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async log(
    actorId: string,
    action: AdminAuditAction,
    targetType: AdminAuditTargetType,
    targetId: string,
    details?: Record<string, unknown>,
  ): Promise<AdminAuditLog> {
    const actor = await this.userRepository.findOne({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException(`Actor with ID ${actorId} not found`);
    }

    const auditLog = this.adminAuditLogRepository.create({
      actorId,
      actorEmail: actor.email,
      action,
      targetType,
      targetId,
      details: details ?? null,
    });

    return this.adminAuditLogRepository.save(auditLog);
  }

  async findPaginated(options: {
    page?: number;
    limit?: number;
    action?: AdminAuditAction;
  }): Promise<{
    data: AdminAuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.max(options.limit ?? 50, 1);
    const where: FindOptionsWhere<AdminAuditLog> = {};

    if (options.action) {
      where.action = options.action;
    }

    const [data, total] = await this.adminAuditLogRepository.findAndCount({
      where,
      order: { performedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
