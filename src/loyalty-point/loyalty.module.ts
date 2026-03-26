import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';

import { LoyaltyService } from './services/loyalty.service';
import { EarnRulesService } from './services/earn-rules.service';

import { LoyaltyController } from './controllers/loyalty.controller';
import { PointsExpiryJob } from './jobs/points-expiry.job';
import { TierChangedListener } from './listeners/tier-changed.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyAccount, LoyaltyTransaction]),
    // ScheduleModule and EventEmitterModule are typically registered once in
    // AppModule; import here only if this module is loaded standalone.
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [LoyaltyController],
  providers: [
    LoyaltyService,
    EarnRulesService,
    PointsExpiryJob,
    TierChangedListener,
  ],
  exports: [LoyaltyService, EarnRulesService],
})
export class LoyaltyModule {}
