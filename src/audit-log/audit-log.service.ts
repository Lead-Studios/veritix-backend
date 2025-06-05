import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { Request } from 'express';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create a new audit log entry
   */
  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Log an action with request information
   */
  async logAction(
    createAuditLogDto: CreateAuditLogDto, 
    req?: Request
  ): Promise<AuditLog> {
    if (req) {
      createAuditLogDto.ipAddress = req.ip;
      createAuditLogDto.userAgent = req.headers['user-agent'] as string;
    }
    
    return this.create(createAuditLogDto);
  }

  /**
   * Find all audit logs with pagination
   */
  async findAll(
    page: number = 1, 
    limit: number = 10, 
    type?: string, 
    userId?: string, 
    adminId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .leftJoinAndSelect('auditLog.admin', 'admin');
    
    // Apply filters if provided
    if (type) {
      queryBuilder.andWhere('auditLog.type = :type', { type });
    }
    
    if (userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId });
    }
    
    if (adminId) {
      queryBuilder.andWhere('auditLog.adminId = :adminId', { adminId });
    }
    
    if (startDate) {
      queryBuilder.andWhere('auditLog.timestamp >= :startDate', { startDate });
    }
    
    if (endDate) {
      queryBuilder.andWhere('auditLog.timestamp <= :endDate', { endDate });
    }
    
    // Add pagination
    const skip = (page - 1) * limit;
    queryBuilder.orderBy('auditLog.timestamp', 'DESC')
      .skip(skip)
      .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find audit log by id
   */
  async findOne(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ 
      where: { id },
      relations: ['user', 'admin']
    });
  }
}
