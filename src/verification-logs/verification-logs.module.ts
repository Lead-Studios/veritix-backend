import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VerificationLogsService } from './verification-logs.service';
import { VerificationLogsController } from './verification-logs.controller';

import { VerificationLog } from './entities/verification-log.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VerificationLog,
      Ticket,
      Event,
    ]),
  ],
  controllers: [VerificationLogsController],
  providers: [VerificationLogsService],
  exports: [VerificationLogsService],
})
export class VerificationLogsModule {}