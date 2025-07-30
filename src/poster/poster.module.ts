import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poster } from './entities/poster.entity';
import { Event } from '../events/entities/event.entity';
import { PosterService } from './services/poster.service';
import { PosterController } from './controllers/poster.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Poster, Event])],
  providers: [PosterService],
  controllers: [PosterController],
})
export class PosterModule {}
