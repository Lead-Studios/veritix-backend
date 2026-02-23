import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VerificationLog } from './verification-log.entity';
import { VerificationLogRepository } from './verification-log.repository';

/**
 * Verification Module for VeriTix
 *
 * This module handles ticket verification operations at events.
 * It provides services for verifying tickets, logging verification
 * attempts, and generating verification statistics.
 *
 * Responsibilities:
 * - Ticket code verification
 * - Check-in operations
 * - Verification logging for audit
 * - Verification statistics
 *
 * The VerificationService is exported for use by other modules
 * that may need to perform verification operations.
 *
 * Usage:
 * ```typescript
 * // In a controller or service
 * @Injectable()
 * export class CheckInService {
 *   constructor(private readonly verificationService: VerificationService) {}
 *
 *   async processCheckIn(ticketCode: string, staffId: string) {
 *     const result = await this.verificationService.checkIn(ticketCode, staffId);
 *     if (result.isValid) {
 *       // Allow entry
 *     }
 *     return result;
 *   }
 * }
 * ```
 */
@Module({
  controllers: [TypeOrmModule.forFeature([VerificationLog]), VerificationController],
  providers: [VerificationService, VerificationLogRepository],
  exports: [VerificationService, VerificationLogRepository],
})
export class VerificationModule {}
