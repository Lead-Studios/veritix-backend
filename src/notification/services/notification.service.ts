import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
} from '../entities/notification.entity';
import { User } from '../../user/entities/user.entity';
import { Event } from '../../event/entities/event.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async addNotification(userId: string, eventId: string, message: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    const notification = this.notificationRepo.create({ user, event, message });
    return this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { user: { id: userId } },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['event'],
    });
    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.user.id !== userId)
      throw new ForbiddenException('Access denied');
    notification.status = NotificationStatus.Read;
    return this.notificationRepo.save(notification);
  }

  async sendTicketAvailableNotification(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
    });

    if (!user || !event) {
      return;
    }

    // Implement your notification logic here
    // This could be email, SMS, push notification, etc.
    console.log(
      `Sending ticket available notification to ${user.email} for event ${event.name}`,
    );

    // Example email notification (you would use a service like SendGrid, AWS SES, etc.)
    // await this.emailService.sendTicketAvailableEmail(user.email, event);

    // Example push notification
    // await this.pushNotificationService.sendPushNotification(user.deviceToken, {
    //   title: 'Tickets Available!',
    //   body: `Tickets are now available for ${event.title}`,
    //   data: { eventId: event.id }
    // });
  }
}
