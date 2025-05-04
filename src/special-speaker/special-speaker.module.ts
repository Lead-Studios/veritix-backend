import { Module } from '@nestjs/common';
import { SpecialSpeakerService } from './special-speaker.service';
import { SpecialSpeakerController } from './special-speaker.controller';

@Module({
  controllers: [SpecialSpeakerController],
  providers: [SpecialSpeakerService],
})
export class SpecialSpeakerModule {}
