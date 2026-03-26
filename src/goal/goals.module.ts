import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Goal } from './entities/goal.entity';
import { GoalTemplate } from './entities/goal-template.entity';
import { CommunityChallenge } from './entities/community-challenge.entity';
import { ChallengeParticipation } from './entities/challenge-participation.entity';

import { GoalTemplateService } from './services/goal-template.service';
import { CommunityChallengeService } from './services/community-challenge.service';
import { GoalsMarketplaceController } from './controllers/goals-marketplace.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Goal,
      GoalTemplate,
      CommunityChallenge,
      ChallengeParticipation,
    ]),
  ],
  controllers: [GoalsMarketplaceController],
  providers: [GoalTemplateService, CommunityChallengeService],
  exports: [GoalTemplateService, CommunityChallengeService],
})
export class GoalsModule {}
