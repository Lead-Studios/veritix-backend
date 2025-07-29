import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialGuest } from './entities/special-guest.entity';
import { Event } from '../events/entities/event.entity';
import { SpecialGuestService } from './services/special-guest.service';
import { SpecialGuestController } from './controllers/special-guest.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpecialGuest, Event])],
  providers: [SpecialGuestService],
  controllers: [SpecialGuestController],
})
export class SpecialGuestModule {} 