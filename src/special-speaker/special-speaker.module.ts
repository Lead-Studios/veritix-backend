import { Module } from '@nestjs/common';
import { SpecialSpeakerService } from './special-speaker.service';
import { SpecialSpeakerController } from './special-speaker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialSpeaker } from './entities/special-speaker.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpecialSpeaker])], // Register the entity here
  controllers: [SpecialSpeakerController],
  providers: [SpecialSpeakerService],
})
export class SpecialSpeakerModule {}
