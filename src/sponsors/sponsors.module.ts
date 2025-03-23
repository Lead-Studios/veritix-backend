import { Module } from '@nestjs/common';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './providers/sponsors.service';
import { Sponsor } from './sponsor.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateSponsorsProvider } from './providers/create-sponsors-provider';
import { FindAllSponsorsProvider } from './providers/find-all-sponsors-provider';
import { FindOneSponsorProvider } from './providers/find-one-sponsor-provider';
import { FindSponsorsByEventProvider } from './providers/find-sponsors-by-event-provider';
import { Event } from 'src/events/entities/event.entity';
import { UpdateSponsorsProvider } from './providers/update-sponsors-provider';
import { RemoveSponsorsProvider } from './providers/remove-sponsors-provider';

@Module({
  imports: [TypeOrmModule.forFeature([Sponsor, Event])],
  controllers: [SponsorsController],
  providers: [
    SponsorsService,
    CreateSponsorsProvider,
    FindAllSponsorsProvider,
    FindOneSponsorProvider,
    FindSponsorsByEventProvider,
    UpdateSponsorsProvider,
    RemoveSponsorsProvider,
  ],
})
export class SponsorsModule {}
