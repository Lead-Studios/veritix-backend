import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Notification,
  NotificationSatus,
} from "./entities/notification.entity";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { User } from "src/users/entities/user.entity";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private mailerService: MailerService,
  ) {}

  async create(
    userId: string,
    eventId: string,
    createNotificationDto: CreateNotificationDto,
  ): Promise<{ data: Notification; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const notification = this.notificationRepository.create({
      userId,
      eventId,
      message: createNotificationDto.message,
      timestamp: new Date(),
    } as Notification);
    return {
      data: await this.notificationRepository.save(notification),
      message: "Notification Created",
    };
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    notifications: Notification[];
    total: number;
    message: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { timestamp: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { notifications, total, message: "All notification fetched" };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<{ data: Notification; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    notification.status = NotificationSatus.READ;
    return {
      data: await this.notificationRepository.save(notification),
      message: "Mark as read",
    };
  }

  async sendTicketAvailableEmail(
    email: string,
    eventName: string,
    userId: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `🎫 Tickets Available: ${eventName}`,
        template: "ticket-available",
        context: {
          eventName,
          userId,
          // Add purchase link with limited time token
          purchaseLink: `${process.env.FRONTEND_URL}/events/purchase?token=${this.generateTimeToken(userId)}`,
        },
      });
    } catch (error) {
      console.error("Failed to send notification email:", error);
    }
  }

  private generateTimeToken(userId: number): string {
    // Generate a time-limited token for purchase
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}`;
    return Buffer.from(data).toString("base64");
  }
}
