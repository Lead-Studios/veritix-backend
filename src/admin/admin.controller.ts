import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { EventStatus } from '../events/enums/event-status.enum';
import { AuditAction } from './entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

class SuspendDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

class RejectEventDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── #610 User Management ──────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.listUsers(+page, +limit, search, role);
  }

  @Get('users/:id')
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/role')
  updateRole(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.adminService.updateRole(actor, id, dto.role);
  }

  // ── #611 User Suspension ──────────────────────────────────────────────────

  @Post('users/:id/suspend')
  suspend(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendDto,
  ) {
    return this.adminService.suspendUser(actor, id, dto.reason);
  }

  @Post('users/:id/unsuspend')
  unsuspend(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unsuspendUser(actor, id);
  }

  // ── #612 Audit Log ────────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('action') action?: AuditAction,
  ) {
    return this.auditLogService.findAll(+page, +limit, action);
  }

  // ── #613 Event Management ─────────────────────────────────────────────────

  @Get('events')
  listEvents(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: EventStatus,
  ) {
    return this.adminService.listAllEvents(+page, +limit, status);
  }

  @Post('events/:id/approve')
  approveEvent(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveEvent(actor, id);
  }

  @Post('events/:id/reject')
  rejectEvent(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectEventDto,
  ) {
    return this.adminService.rejectEvent(actor, id, dto.reason);
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
import { RefundDto } from './dto/refund.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Issue #614
  @Post('orders/:id/refund')
  @Roles(UserRole.ADMIN)
  refundOrder(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.adminService.refundOrder(id, dto.reason);
  }

  // Issue #615
  @Get('events/:id/analytics')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getEventAnalytics(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.adminService.getEventAnalytics(id);
  }

  // Issue #616
  @Get('stellar/transactions')
  @Roles(UserRole.ADMIN)
  getRecentTransactions(@Query('limit') limit?: string) {
    return this.adminService.getRecentTransactions(limit ? parseInt(limit, 10) : 20);
  }
}
