import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

import { PricingEngineService } from './services/pricing-engine.service';
import { DemandAnalysisService } from './services/demand-analysis.service';
import { CompetitorMonitoringService } from './services/competitor-monitoring.service';
import { PricingOptimizationService } from './services/pricing-optimization.service';
import { ABTestingService } from './services/ab-testing.service';

import { DynamicPricingController } from './controllers/dynamic-pricing.controller';
import { PricingRulesController } from './controllers/pricing-rules.controller';
import { RevenueOptimizationController } from './controllers/revenue-optimization.controller';

import { PricingRule } from './entities/pricing-rule.entity';
import { PricingHistory } from './entities/pricing-history.entity';
import { DemandMetric } from './entities/demand-metric.entity';
import { CompetitorPrice } from './entities/competitor-price.entity';
import { ABTest } from './entities/ab-test.entity';
import { PriceRecommendation } from './entities/price-recommendation.entity';

import { PricingCalculationProcessor } from './processors/pricing-calculation.processor';
import { CompetitorMonitoringProcessor } from './processors/competitor-monitoring.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingRule,
      PricingHistory,
      DemandMetric,
      CompetitorPrice,
      ABTest,
      PriceRecommendation,
    ]),
    BullModule.registerQueue(
      {
        name: 'pricing-calculation',
      },
      {
        name: 'competitor-monitoring',
      }
    ),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [
    DynamicPricingController,
    PricingRulesController,
    RevenueOptimizationController,
  ],
  providers: [
    PricingEngineService,
    DemandAnalysisService,
    CompetitorMonitoringService,
    PricingOptimizationService,
    ABTestingService,
    PricingCalculationProcessor,
    CompetitorMonitoringProcessor,
  ],
  exports: [
    PricingEngineService,
    DemandAnalysisService,
    PricingOptimizationService,
  ],
})
export class DynamicPricingModule {}
