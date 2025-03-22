import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialGuest } from './entities/special-guest.entity';
import { SpecialGuestService } from './special-guests.service';
import { SpecialGuestController } from './special-guests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpecialGuest])],
  providers: [SpecialGuestService],
  controllers: [SpecialGuestController],
})
export class SpecialGuestModule {}
