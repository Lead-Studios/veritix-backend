import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Sponsor } from './entities/sponsor.entity';
import { Event } from '../events/entities/event.entity';
import { SponsorService } from './services/sponsor.service';
import { SponsorController } from './controllers/sponsor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsor, Event]),
    MulterModule.register(),
  ],
  providers: [SponsorService],
  controllers: [SponsorController],
  exports: [SponsorService],
})
export class SponsorModule {}
