import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendeeController } from './attendee.controller';
import { AttendeeService } from './attendee.service';
import { Attendee } from './entities/attendee.entity';
import { Ticket } from './entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import { Session } from '../conference/entities/session.entity';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendee, Ticket, Conference, Session]),
    BadgeModule,
  ],
  controllers: [AttendeeController],
  providers: [AttendeeService],
  exports: [AttendeeService],
})
export class AttendeeModule {}
