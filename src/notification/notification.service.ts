import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationSatus } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>
  ) { }

  async create(userId: string, eventId: string, createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const user = await this.notificationRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const notification = this.notificationRepository.create({
      userId,
      eventId,
      message: createNotificationDto.message,
      timestamp: new Date()
    });
    return this.notificationRepository.save(notification);
  }

  async findAll(userId: string, page: number, limit: number): Promise<{ notifications: Notification[]; total: number }> {
    const user = await this.notificationRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });
    return { notifications, total };
  }
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const user = await this.notificationRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const notification = await this.notificationRepository.findOne({ where: { id: notificationId, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.status = NotificationSatus.READ;
    return this.notificationRepository.save(notification);
  }
}