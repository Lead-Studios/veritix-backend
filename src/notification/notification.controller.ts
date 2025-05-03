import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { Notification } from "./entities/notification.entity";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { Request } from "express";

@Controller("notifications/users")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post(":userId/events/:eventId")
  async addNotification(
    @Req() req: Request,
    @Param("eventId") eventId: string,
    @Param("userId") userId: string,
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<{ data: Notification; message: string }> {
    // const user = req.user as any;
    // const userId = user.userId;
    return this.notificationService.create(
      userId,
      eventId,
      createNotificationDto,
    );
  }

  @Get(":userId")
  async getUserNotifications(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Param("userId") userId: string,
  ): Promise<{ notifications: Notification[]; total: number }> {
    // const user = req.user as any;
    // const userId = user.id;
    return this.notificationService.findAll(userId, page, limit);
  }

  @Patch(":userId/:notificationId/read")
  async markAsRead(
    @Req() req: Request,
    @Param("notificationId") notificationId: string,
    @Param("userId") userId: string,
  ): Promise<{ data: Notification; message: string }> {
    // const user = req.user as any;
    // const userId = user.id;
    return this.notificationService.markAsRead(userId, notificationId);
  }
}
