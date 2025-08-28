import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LoginSecurityService } from '../services/login-security.service';
import { SecurityNotificationService } from '../services/security-notification.service';

@ApiTags('Login Security')
@Controller('login-security')
@ApiBearerAuth()
export class LoginSecurityController {
  constructor(
    private readonly loginSecurityService: LoginSecurityService,
    private readonly securityNotificationService: SecurityNotificationService,
  ) {}

  @Get('login-history')
  @ApiOperation({ summary: 'Get user login history' })
  @ApiResponse({ status: 200, description: 'Login history retrieved successfully' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getLoginHistory(
    @Query('limit') limit?: number,
    @Request() req?,
  ) {
    return this.loginSecurityService.getLoginHistory(
      req.user.id,
      limit || 50,
      req.user.ownerId,
    );
  }

  @Get('trusted-devices')
  @ApiOperation({ summary: 'Get user trusted devices' })
  @ApiResponse({ status: 200, description: 'Trusted devices retrieved successfully' })
  async getTrustedDevices(@Request() req) {
    return this.loginSecurityService.getTrustedDevices(req.user.id, req.user.ownerId);
  }

  @Patch('trusted-devices/:deviceId/revoke')
  @ApiOperation({ summary: 'Revoke a trusted device' })
  @ApiResponse({ status: 200, description: 'Device revoked successfully' })
  async revokeTrustedDevice(@Param('deviceId') deviceId: string, @Request() req) {
    await this.loginSecurityService.revokeTrustedDevice(deviceId, req.user.id, req.user.ownerId);
    return { message: 'Device revoked successfully' };
  }

  @Get('security-stats')
  @ApiOperation({ summary: 'Get security statistics' })
  @ApiResponse({ status: 200, description: 'Security stats retrieved successfully' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getSecurityStats(
    @Query('days') days?: number,
    @Request() req?,
  ) {
    return this.loginSecurityService.getSecurityStats(
      req.user.id,
      days || 30,
      req.user.ownerId,
    );
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get security notifications' })
  @ApiResponse({ status: 200, description: 'Security notifications retrieved successfully' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getNotifications(
    @Query('limit') limit?: number,
    @Request() req?,
  ) {
    return this.securityNotificationService.getUserNotifications(
      req.user.id,
      limit || 50,
      req.user.ownerId,
    );
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@Request() req) {
    const count = await this.securityNotificationService.getUnreadCount(
      req.user.id,
      req.user.ownerId,
    );
    return { count };
  }

  @Patch('notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @Request() req,
  ) {
    await this.securityNotificationService.markAsRead(
      notificationId,
      req.user.id,
      req.user.ownerId,
    );
    return { message: 'Notification marked as read' };
  }
}
