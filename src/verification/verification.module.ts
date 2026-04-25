import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VerificationGateway } from './verification.gateway';
import { VerificationLog } from './entities/verification-log.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketType } from '../ticket-types/entities/ticket-type.entity';
import { Event } from '../events/entities/event.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationLog, Ticket, Event])],
  controllers: [VerificationController],
  providers: [VerificationService],
  imports: [
    TypeOrmModule.forFeature([VerificationLog, Ticket, TicketType, Event]),
    AuthModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationGateway],
  exports: [VerificationService],
})
export class VerificationModule {}
