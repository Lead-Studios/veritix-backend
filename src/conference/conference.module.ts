import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conference } from './entities/conference.entity';
import { AuthModule } from '../auth/auth.module';
import { ConferenceService } from './providers/conference.service';
import { ConferenceController } from './controllers/conference.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conference]),
    AuthModule, // Import AuthModule to use guards and decorators
  ],
  controllers: [ConferenceController],
  providers: [ConferenceService],
  exports: [ConferenceService],
})
export class ConferenceModule {}