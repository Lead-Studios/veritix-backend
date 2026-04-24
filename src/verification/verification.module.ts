import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { VerificationLog } from './entities/verification-log.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationLog, Ticket, Event]),
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
import { VerificationController } from './verification.controller';
import { VerificationLog } from './entities/verification-log.entity';
import { Event } from '../events/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationLog, Event])],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
