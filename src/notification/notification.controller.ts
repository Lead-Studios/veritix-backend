import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('notifications/users')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('events/:eventId')
  async addNotification(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const user = req.user as any;
    const userId = user.id; 
    return this.notificationService.create(userId, eventId, createNotificationDto);
  }

  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<{ notifications: Notification[]; total: number }> {
    const user = req.user as any;
    const userId = user.id; 
    return this.notificationService.findAll(userId, page, limit);
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @Req() req: Request,
    @Param('notificationId') notificationId: string
  ): Promise<Notification> {
    const user = req.user as any;
    const userId = user.id; 
    return this.notificationService.markAsRead(userId, notificationId);
  }
}
