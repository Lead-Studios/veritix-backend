import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeakersService } from './speakers.service';
import { Speaker } from './entities/speaker.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Speaker])],
  providers: [SpeakersService],
  exports: [SpeakersService],
})
export class SpeakersModule {}