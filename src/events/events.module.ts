import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';
import { EventWaitlist } from './entities/event-waitlist.entity';
import { WaitlistService } from './waitlist.service';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventWaitlist]), EmailModule],
  controllers: [EventsController],
  providers: [EventsService, WaitlistService],
  exports: [EventsService, WaitlistService],
})
export class EventsModule {}
