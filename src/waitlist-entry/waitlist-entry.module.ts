import { Module } from '@nestjs/common';
import { WaitlistEntryService } from './waitlist-entry.service';
import { WaitlistEntryController } from './waitlist-entry.controller';

@Module({
  controllers: [WaitlistEntryController],
  providers: [WaitlistEntryService],
})
export class WaitlistEntryModule {}
