import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreference } from './entities/user-preference.entity';
import { UserInteraction } from './entities/user-interaction.entity';
import { RecommendationModel } from './entities/recommendation-model.entity';
import { Recommendation } from './entities/recommendation.entity';
import { RecommendationAnalytics } from './entities/recommendation-analytics.entity';
import { AbTestExperiment } from './entities/ab-test-experiment.entity';
import { UserBehaviorTrackingService } from './services/user-behavior-tracking.service';
import { CollaborativeFilteringService } from './services/collaborative-filtering.service';
import { ContentBasedFilteringService } from './services/content-based-filtering.service';
import { MLTrainingService } from './services/ml-training.service';
import { RecommendationEngineService } from './services/recommendation-engine.service';
import { ABTestingService } from './services/ab-testing.service';
import { RecommendationExplanationService } from './services/recommendation-explanation.service';
import { RecommendationsController } from './controllers/recommendations.controller';
import { RecommendationsAdminController } from './controllers/recommendations-admin.controller';
import { UserModule } from '../user/user.module';
import { EventsModule } from '../events/events.module';
import { TicketModule } from '../ticket/ticket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreference,
      UserInteraction,
      RecommendationModel,
      Recommendation,
      RecommendationAnalytics,
      AbTestExperiment,
    ]),
    UserModule,
    EventsModule,
    TicketModule,
  ],
  providers: [
    UserBehaviorTrackingService,
    CollaborativeFilteringService,
    ContentBasedFilteringService,
    MLTrainingService,
    RecommendationEngineService,
    ABTestingService,
    RecommendationExplanationService,
  ],
  controllers: [
    RecommendationsController,
    RecommendationsAdminController,
  ],
  exports: [
    UserBehaviorTrackingService,
    RecommendationEngineService,
    ABTestingService,
    RecommendationExplanationService,
  ],
})
export class AIRecommendationsModule {}
