import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationSatus } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(userId: number, eventId: number, createNotificationDto: CreateNotificationDto): Promise<{data: Notification, message:string}> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const notification = this.notificationRepository.create({
      userId,
      eventId,
      message: createNotificationDto.message,
      timestamp: new Date()
    });
    return{
      data: await this.notificationRepository.save(notification), 
      message: 'Notification Created'
    };
  }

  async findAll(userId: number, page: number, limit: number): Promise<{ notifications: Notification[]; total: number, message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });
    return { notifications, total, message: 'All notification fetched' };
  }

  async markAsRead(userId: number, notificationId: number): Promise<{data: Notification, message: string}> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const notification = await this.notificationRepository.findOne({ where: { id: notificationId, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.status = NotificationSatus.READ;
     return{
       data: await this.notificationRepository.save(notification) ,
      message: "Mark as read"
     }
  }
}