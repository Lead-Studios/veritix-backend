import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { IntelligentWaitlistEntry } from './entities/waitlist-entry.entity';
import { WaitlistNotificationPreference } from './entities/waitlist-notification-preference.entity';
import { WaitlistTicketRelease } from './entities/waitlist-ticket-release.entity';
import { WaitlistAnalytics } from './entities/waitlist-analytics.entity';

// Services
import { IntelligentWaitlistService } from './services/intelligent-waitlist.service';
import { QueueManagementService } from './services/queue-management.service';
import { VipPriorityService } from './services/vip-priority.service';
import { BulkManagementService } from './services/bulk-management.service';
import { WaitlistAnalyticsService } from './services/waitlist-analytics.service';
import { NotificationCampaignService } from './services/notification-campaign.service';

// Controllers
import { IntelligentWaitlistController } from './controllers/intelligent-waitlist.controller';

// Processors
import { TicketReleaseProcessor } from './processors/ticket-release.processor';
import { NotificationProcessor } from './processors/notification.processor';

// External entities
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntelligentWaitlistEntry,
      WaitlistNotificationPreference,
      WaitlistTicketRelease,
      WaitlistAnalytics,
      User,
      Event,
      Ticket,
    ]),
    BullModule.registerQueue(
      {
        name: 'ticket-releases',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'waitlist-notifications',
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
      {
        name: 'email-notifications',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'sms-notifications',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'push-notifications',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'bulk-operations',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'waitlist-analytics',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
    ),
    ScheduleModule.forRoot(),
  ],
  controllers: [IntelligentWaitlistController],
  providers: [
    IntelligentWaitlistService,
    QueueManagementService,
    VipPriorityService,
    BulkManagementService,
    WaitlistAnalyticsService,
    NotificationCampaignService,
    TicketReleaseProcessor,
    NotificationProcessor,
  ],
  exports: [
    IntelligentWaitlistService,
    QueueManagementService,
    VipPriorityService,
    BulkManagementService,
    WaitlistAnalyticsService,
    NotificationCampaignService,
  ],
})
export class IntelligentWaitlistModule {}
