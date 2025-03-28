import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Notification } from "./entities/notification.entity"

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async create(notificationData: {
    userId: string
    title: string
    message: string
    type: string
    data?: any
  }): Promise<Notification> {
    const notification = new Notification()
    notification.userId = notificationData.userId
    notification.title = notificationData.title
    notification.message = notificationData.message
    notification.type = notificationData.type
    notification.data = notificationData.data

    return this.notificationsRepository.save(notification)
  }

  // Other notification methods...
}

