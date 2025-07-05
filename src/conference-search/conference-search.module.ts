/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Module } from '@nestjs/common';
import { ConferenceSearchService } from './conference-search.service';
import { ConferenceSearchController } from './conference-search.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conference } from './entities/conference.entity';
import { FuzzySearchService } from './services/fuzzy-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conference]),
    ThrottlerModule.forRoot({
      ttl: 60, // 1 minute (in seconds)
      limit: 100, // 100 requests per minute
    }),
  ],
  controllers: [ConferenceSearchController],
  providers: [ConferenceSearchService, FuzzySearchService],
  exports: [ConferenceSearchService],
})
export class ConferenceSearchModule {}
