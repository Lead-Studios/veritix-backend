import { Module } from '@nestjs/common';
import { SpecialGuest } from './entities/special-guest.entity';
import { Event } from '../events/entities/event.entity';
import { SpecialGuestService } from './services/special-guest.service';
import { SpecialGuestController } from './controllers/special-guest.controller';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [TenantRepositoryModule.forFeature([SpecialGuest, Event])],
  providers: [SpecialGuestService],
  controllers: [SpecialGuestController],
})
export class SpecialGuestModule {} 