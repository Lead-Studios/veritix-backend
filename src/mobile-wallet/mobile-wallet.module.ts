import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Entities
import { WalletPass } from './entities/wallet-pass.entity';
import { PassTemplate } from './entities/pass-template.entity';
import { PassAnalytics } from './entities/pass-analytics.entity';
import { PassUpdate } from './entities/pass-update.entity';

// Services
import { ApplePassKitService } from './services/apple-passkit.service';
import { GooglePayService } from './services/google-pay.service';
import { PassTemplateService } from './services/pass-template.service';
import { QRCodeService } from './services/qr-code.service';
import { PassUpdateService } from './services/pass-update.service';
import { GeolocationNotificationService } from './services/geolocation-notification.service';
import { PassSharingService } from './services/pass-sharing.service';
import { PassAnalyticsService } from './services/pass-analytics.service';

// Controllers
import { MobileWalletController } from './controllers/mobile-wallet.controller';

// Processors
import { PassUpdateProcessor } from './processors/pass-update.processor';
import { LocationNotificationProcessor, PassSharingProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      WalletPass,
      PassTemplate,
      PassAnalytics,
      PassUpdate,
    ]),
    BullModule.registerQueue(
      {
        name: 'pass-updates',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'location-notifications',
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          removeOnComplete: 50,
          removeOnFail: 25,
        },
      },
      {
        name: 'pass-sharing',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
    ),
  ],
  controllers: [MobileWalletController],
  providers: [
    // Core Services
    ApplePassKitService,
    GooglePayService,
    PassTemplateService,
    QRCodeService,
    PassUpdateService,
    GeolocationNotificationService,
    PassSharingService,
    PassAnalyticsService,
    
    // Background Processors
    PassUpdateProcessor,
    LocationNotificationProcessor,
    PassSharingProcessor,
  ],
  exports: [
    ApplePassKitService,
    GooglePayService,
    PassTemplateService,
    QRCodeService,
    PassUpdateService,
    GeolocationNotificationService,
    PassSharingService,
    PassAnalyticsService,
  ],
})
export class MobileWalletModule {}
