import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConferencePosterManagementService } from './conference-poster-management.service';
import { ConferencePosterManagementController } from './conference-poster-management.controller';
import { ConferencePoster } from './entities/conference-poster.entity';
import { Conference } from '../conference/entities/conference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConferencePoster, Conference]),
    MulterModule.register({
      dest: './uploads/conference-posters',
    }),
  ],
  controllers: [ConferencePosterManagementController],
  providers: [ConferencePosterManagementService],
  exports: [ConferencePosterManagementService],
})
export class ConferencePosterManagementModule {}
