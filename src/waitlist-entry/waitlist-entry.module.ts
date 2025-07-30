import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist-entry.service';
import { WaitlistController } from './waitlist-entry.controller';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from 'src/notification/services/notification.service';
import { User } from 'src/user/entities/user.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { WaitlistNotificationProcessor } from './processors/waitlist-notification.processor';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TenantRepositoryModule.forFeature([WaitlistEntry, User, Event]),
    BullModule.registerQueue({
      name: 'waitlist-notifications',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  controllers: [WaitlistController],
  providers: [
    WaitlistService,
    NotificationService,
    WaitlistNotificationProcessor,
  ],
  exports: [WaitlistService],
})
export class WaitlistEntryModule {}
