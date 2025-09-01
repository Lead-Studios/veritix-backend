import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { PWASubscription } from './entities/pwa-subscription.entity';
import { OfflineData } from './entities/offline-data.entity';
import { PushNotification } from './entities/push-notification.entity';
import { BackgroundSyncJob } from './entities/background-sync.entity';
import { PWAAnalytics } from './entities/pwa-analytics.entity';
import { PWACache } from './entities/pwa-cache.entity';

// Services
import { PushNotificationService } from './services/push-notification.service';
import { OfflineDataService } from './services/offline-data.service';
import { BackgroundSyncService } from './services/background-sync.service';
import { PWAAnalyticsService } from './services/pwa-analytics.service';
import { OfflineEventDiscoveryService } from './services/offline-event-discovery.service';

// Controllers
import { PWAController } from './controllers/pwa.controller';
import { PWAAdminController } from './controllers/pwa-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PWASubscription,
      OfflineData,
      PushNotification,
      BackgroundSyncJob,
      PWAAnalytics,
      PWACache,
    ]),
    BullModule.registerQueue({
      name: 'pwa-sync',
    }),
    BullModule.registerQueue({
      name: 'pwa-notifications',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [PWAController, PWAAdminController],
  providers: [
    PushNotificationService,
    OfflineDataService,
    BackgroundSyncService,
    PWAAnalyticsService,
  ],
  exports: [
    PushNotificationService,
    OfflineDataService,
    BackgroundSyncService,
    PWAAnalyticsService,
  ],
})
export class PWAModule {}
