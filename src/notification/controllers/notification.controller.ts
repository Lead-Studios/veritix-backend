import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

class AddNotificationDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('users/:userId/events/:eventId')
  @ApiOperation({ summary: 'Add a new event notification for a user' })
  async addNotification(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: AddNotificationDto,
    @Req() req
  ) {
    // Only allow self or admin
    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.addNotification(userId, eventId, dto.message);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get all notifications for a user (paginated)' })
  async getUserNotifications(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() req
  ) {
    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getUserNotifications(userId, page, limit);
  }

  @Patch('users/:userId/:notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Req() req
  ) {
    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.markAsRead(userId, notificationId);
  }
} 