import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { EmailTemplate } from './entities/email-template.entity';
import { TemplateComponent } from './entities/template-component.entity';
import { EmailCampaign } from './entities/email-campaign.entity';
import { CampaignSegment } from './entities/campaign-segment.entity';
import { UserSegment } from './entities/user-segment.entity';
import { SegmentRule } from './entities/segment-rule.entity';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { AutomationTrigger } from './entities/automation-trigger.entity';
import { AutomationAction } from './entities/automation-action.entity';
import { ABTest } from './entities/ab-test.entity';
import { TestVariant } from './entities/test-variant.entity';
import { EmailDelivery } from './entities/email-delivery.entity';
import { EmailOpen } from './entities/email-open.entity';
import { EmailClick } from './entities/email-click.entity';
import { EmailBounce } from './entities/email-bounce.entity';

// Services
import { TemplateService } from './services/template.service';
import { CampaignService } from './services/campaign.service';
import { AutomationService } from './services/automation.service';
import { AnalyticsService } from './services/analytics.service';

// Controllers
import { TemplateController } from './controllers/template.controller';
import { CampaignController } from './controllers/campaign.controller';
import { AutomationController } from './controllers/automation.controller';
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Template entities
      EmailTemplate,
      TemplateComponent,
      
      // Campaign entities
      EmailCampaign,
      CampaignSegment,
      
      // Segmentation entities
      UserSegment,
      SegmentRule,
      
      // Automation entities
      AutomationWorkflow,
      AutomationTrigger,
      AutomationAction,
      
      // A/B Testing entities
      ABTest,
      TestVariant,
      
      // Email tracking entities
      EmailDelivery,
      EmailOpen,
      EmailClick,
      EmailBounce,
    ]),
  ],
  controllers: [
    TemplateController,
    CampaignController,
    AutomationController,
    AnalyticsController,
  ],
  providers: [
    TemplateService,
    CampaignService,
    AutomationService,
    AnalyticsService,
  ],
  exports: [
    TemplateService,
    CampaignService,
    AutomationService,
    AnalyticsService,
  ],
})
export class EmailMarketingModule {}
