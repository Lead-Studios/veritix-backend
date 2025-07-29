import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';
import { Attendee } from '../conference/entities/attendee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendee])],
  providers: [BadgeService],
  controllers: [BadgeController]
})
export class BadgeModule {}
