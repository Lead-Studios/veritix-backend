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
