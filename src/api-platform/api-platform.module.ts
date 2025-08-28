import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { ApiKey } from './entities/api-key.entity';
import { ApiUsage } from './entities/api-usage.entity';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { Developer } from './entities/developer.entity';
import { ApiDocumentation } from './entities/api-documentation.entity';

// Services
import { ApiKeyService } from './services/api-key.service';
import { ApiUsageService } from './services/api-usage.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { WebhookService } from './services/webhook.service';
import { SdkGeneratorService } from './services/sdk-generator.service';

// Controllers
import { ApiKeyController } from './controllers/api-key.controller';
import { WebhookController } from './controllers/webhook.controller';
import { DeveloperController } from './controllers/developer.controller';
import { ApiDocumentationController } from './controllers/api-documentation.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { SdkController } from './controllers/sdk.controller';

// Guards and Interceptors
import { ApiAuthGuard } from './guards/api-auth.guard';
import { ApiUsageInterceptor } from './interceptors/api-usage.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiKey,
      ApiUsage,
      Webhook,
      WebhookDelivery,
      Developer,
      ApiDocumentation,
    ]),
    HttpModule,
  ],
  providers: [
    ApiKeyService,
    ApiUsageService,
    RateLimiterService,
    WebhookService,
    ApiAuthGuard,
    ApiUsageInterceptor,
  ],
  controllers: [
    ApiKeyController,
    WebhookController,
    DeveloperController,
    ApiDocumentationController,
    AnalyticsController,
    SdkController,
  ],
  exports: [
    ApiKeyService,
    ApiUsageService,
    RateLimiterService,
    WebhookService,
    ApiAuthGuard,
    ApiUsageInterceptor,
  ],
})
export class ApiPlatformModule {}
