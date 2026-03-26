import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../entities/admin-audit-log.entity';

export class AdminAuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty()
  actorEmail: string;

  @ApiProperty({ enum: AdminAuditAction })
  action: AdminAuditAction;

  @ApiProperty({ enum: AdminAuditTargetType })
  targetType: AdminAuditTargetType;

  @ApiProperty()
  targetId: string;

  @ApiPropertyOptional()
  details: Record<string, unknown> | null;

  @ApiProperty()
  performedAt: Date;
}

export class PaginatedAdminAuditLogResponseDto {
  @ApiProperty({ type: [AdminAuditLogResponseDto] })
  data: AdminAuditLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
