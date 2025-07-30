import { Module } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';

@Module({
  providers: [RsvpService],
  controllers: [RsvpController]
})
export class RsvpModule {}
