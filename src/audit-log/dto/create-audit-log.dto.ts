import { IsEnum, IsOptional, IsString, IsUUID, IsNumber, IsObject } from 'class-validator';
import { AuditLogType } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsEnum(AuditLogType)
  type: AuditLogType;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsNumber()
  adminId?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
