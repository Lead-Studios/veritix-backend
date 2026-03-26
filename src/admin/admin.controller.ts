import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { AdminService } from './admin.service';
import { AdminStatsResponseDto } from './dto/admin-stats.dto';
import { PaginatedAdminAuditLogResponseDto } from './dto/admin-audit-log.dto';
import { AdminAuditAction } from './entities/admin-audit-log.entity';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide aggregate stats (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Aggregate stats',
    type: AdminStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  async getStats(): Promise<AdminStatsResponseDto> {
    return this.adminService.getStats();
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get paginated admin audit logs (ADMIN only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AdminAuditAction,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit log entries',
    type: PaginatedAdminAuditLogResponseDto,
  })
  async getAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: AdminAuditAction,
  ): Promise<PaginatedAdminAuditLogResponseDto> {
    return this.adminService.getAuditLog({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      action,
    });
  }
}
