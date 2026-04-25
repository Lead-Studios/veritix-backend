import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    actorId: string,
    actorEmail: string,
    action: AuditAction,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({ actorId, actorEmail, action, targetType, targetId, details }),
    );
  }

  async findAll(page = 1, limit = 20, action?: AuditAction) {
    const qb = this.repo.createQueryBuilder('log').orderBy('log.performedAt', 'DESC');
    if (action) qb.where('log.action = :action', { action });
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
