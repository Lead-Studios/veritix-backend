import { BlockchainAnchorStatus } from '../../blockchain/enums';

/**
 * EventBlockchainAnchorResult
 * Result of anchoring an event to blockchain
 */
export interface EventBlockchainAnchorResult {
  success: boolean;
  eventId: string;
  anchorHash: string | null;
  transactionId: string | null;
  message: string;
}

/**
 * EventBlockchainVerificationResult
 * Result of verifying an event's blockchain anchor
 */
export interface EventBlockchainVerificationResult {
  isValid: boolean;
  eventId: string;
  anchorHash: string;
  message: string;
  verifiedAt: Date;
}
