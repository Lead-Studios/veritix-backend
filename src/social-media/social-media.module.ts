import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { SocialAccount } from './entities/social-account.entity';
import { SocialPost } from './entities/social-post.entity';
import { SocialCampaign } from './entities/social-campaign.entity';
import { ReferralProgram } from './entities/referral-program.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralTracking } from './entities/referral-tracking.entity';
import { SocialProof } from './entities/social-proof.entity';
import { UserGeneratedContent } from './entities/user-generated-content.entity';
import { InfluencerCollaboration } from './entities/influencer-collaboration.entity';

// Services
import { SocialMediaApiService } from './services/social-media-api.service';
import { SocialPostService } from './services/social-post.service';
import { ReferralProgramService } from './services/referral-program.service';
import { SocialProofService } from './services/social-proof.service';
import { InfluencerCollaborationService } from './services/influencer-collaboration.service';
import { SocialMediaAnalyticsService } from './services/social-media-analytics.service';

// Controllers
import { SocialAccountController } from './controllers/social-account.controller';
import { SocialPostController } from './controllers/social-post.controller';
import { ReferralProgramController } from './controllers/referral-program.controller';
import { SocialProofController } from './controllers/social-proof.controller';
import { InfluencerCollaborationController } from './controllers/influencer-collaboration.controller';
import { SocialMediaAnalyticsController } from './controllers/social-media-analytics.controller';
import { UserGeneratedContentController } from './controllers/user-generated-content.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SocialAccount,
      SocialPost,
      SocialCampaign,
      ReferralProgram,
      ReferralCode,
      ReferralTracking,
      SocialProof,
      UserGeneratedContent,
      InfluencerCollaboration,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    SocialMediaApiService,
    SocialPostService,
    ReferralProgramService,
    SocialProofService,
    InfluencerCollaborationService,
    SocialMediaAnalyticsService,
  ],
  controllers: [
    SocialAccountController,
    SocialPostController,
    ReferralProgramController,
    SocialProofController,
    InfluencerCollaborationController,
    SocialMediaAnalyticsController,
    UserGeneratedContentController,
  ],
  exports: [
    SocialMediaApiService,
    SocialPostService,
    ReferralProgramService,
    SocialProofService,
    InfluencerCollaborationService,
    SocialMediaAnalyticsService,
  ],
})
export class SocialMediaModule {}
