import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FxQuote } from './entities/fx-quote.entity';
import { FxConversion } from './entities/fx-conversion.entity';

import { FxConversionService } from './services/fx-conversion.service';
import { FeeCalculatorService } from './services/fee-calculator.service';
import { RegulatoryDisclosureService } from './services/regulatory-disclosure.service';

import { FxConversionController } from './controllers/fx-conversion.controller';

/**
 * FxModule requires:
 *  - RedisModule / IoRedisModule registered in AppModule (provides @InjectRedis())
 *  - LoyaltyModule exported so FeeCalculatorService can reference LoyaltyTier
 *
 * AppModule example:
 *   RedisModule.forRoot({ config: { host: process.env.REDIS_HOST, port: 6379 } })
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FxQuote, FxConversion]),
  ],
  controllers: [FxConversionController],
  providers: [
    FxConversionService,
    FeeCalculatorService,
    RegulatoryDisclosureService,
  ],
  exports: [FxConversionService, FeeCalculatorService],
})
export class FxModule {}
