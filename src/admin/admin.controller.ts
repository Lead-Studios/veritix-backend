import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../auth/entities/user.entity';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Controller('api/v1/admin/users')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetails(id);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  updateRole(
    @CurrentUser() currentUser: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminUserRoleDto,
  ) {
    return this.adminService.updateUserRole(currentUser.id, id, body.role);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @CurrentUser() currentUser: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(currentUser.id, id, body.reason);
  }

  @Post(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  unsuspendUser(
    @CurrentUser() currentUser: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminService.unsuspendUser(currentUser.id, id);
import { AdminService } from './admin.service';
import { AdminStatsResponseDto } from './dto/admin-stats.dto';

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
}
