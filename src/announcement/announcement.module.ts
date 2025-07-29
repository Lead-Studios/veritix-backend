import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementDelivery } from './entities/announcement-delivery.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../user/entities/user.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { AnnouncementService } from './services/announcement.service';
import { AnnouncementController } from './controllers/announcement.controller';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementDelivery,
      Event,
      User,
      Ticket,
    ]),
    UserModule,
    NotificationModule,
  ],
  providers: [AnnouncementService],
  controllers: [AnnouncementController],
  exports: [AnnouncementService],
})
export class AnnouncementModule {} 