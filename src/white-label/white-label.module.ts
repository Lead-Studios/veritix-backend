import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Tenant } from './entities/tenant.entity';
import { TenantBranding } from './entities/tenant-branding.entity';
import { TenantFeature } from './entities/tenant-feature.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { TenantAnalytics } from './entities/tenant-analytics.entity';
import { TenantIntegration } from './entities/tenant-integration.entity';

// Services
import { TenantService } from './services/tenant.service';
import { TenantBrandingService } from './services/tenant-branding.service';
import { TenantFeatureService } from './services/tenant-feature.service';
import { TenantDomainService } from './services/tenant-domain.service';
import { TenantSubscriptionService } from './services/tenant-subscription.service';
import { TenantIntegrationService } from './services/tenant-integration.service';
import { TenantAnalyticsService } from './services/tenant-analytics.service';

// Controllers
import { TenantController } from './controllers/tenant.controller';
import { TenantBrandingController } from './controllers/tenant-branding.controller';
import { TenantFeatureController } from './controllers/tenant-feature.controller';
import { TenantDomainController } from './controllers/tenant-domain.controller';
import { TenantSubscriptionController, SubscriptionManagementController } from './controllers/tenant-subscription.controller';
import { TenantIntegrationController, IntegrationManagementController } from './controllers/tenant-integration.controller';
import { TenantAnalyticsController } from './controllers/tenant-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantBranding,
      TenantFeature,
      TenantSubscription,
      TenantDomain,
      TenantAnalytics,
      TenantIntegration,
    ]),
  ],
  controllers: [
    TenantController,
    TenantBrandingController,
    TenantFeatureController,
    TenantDomainController,
    TenantSubscriptionController,
    SubscriptionManagementController,
    TenantIntegrationController,
    IntegrationManagementController,
    TenantAnalyticsController,
  ],
  providers: [
    TenantService,
    TenantBrandingService,
    TenantFeatureService,
    TenantDomainService,
    TenantSubscriptionService,
    TenantIntegrationService,
    TenantAnalyticsService,
  ],
  exports: [
    TenantService,
    TenantBrandingService,
    TenantFeatureService,
    TenantDomainService,
    TenantSubscriptionService,
    TenantIntegrationService,
    TenantAnalyticsService,
  ],
})
export class WhiteLabelModule {}
