import { Module } from '@nestjs/common';
import { PromoCodeController } from './promo-code.controller';
import { PromoCodeService } from './providers/promo-code.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './promoCode.entity';
import { Event } from 'src/events/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode, Event])],
  controllers: [PromoCodeController],
  providers: [PromoCodeService],
  exports: [PromoCodeService]
})
export class PromoCodeModule {}
