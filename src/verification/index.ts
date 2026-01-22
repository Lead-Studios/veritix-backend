/**
 * Verification Module Barrel Export
 *
 * Re-exports all public verification module components for easy importing.
 */

// Module
export { VerificationModule } from './verification.module';

// Service
export { VerificationService } from './verification.service';

// Enums (runtime values)
export { VerificationStatus } from './interfaces/verification.interface';

// Types (use export type for interfaces)
export type {
  VerificationResult,
  VerificationRequest,
  VerificationLog,
  VerificationStats,
  VerifiedTicketInfo,
} from './interfaces/verification.interface';
