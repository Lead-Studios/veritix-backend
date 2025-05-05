import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgeController } from './badge.controller';
import { BadgeService } from './badge.service';
import { Ticket } from '../attendee/entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Conference])],
  controllers: [BadgeController],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}