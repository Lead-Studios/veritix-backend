import { BlockchainAnchorStatus } from '../../blockchain/enums';

/**
 * TicketBlockchainAnchorResult
 * Result of anchoring a ticket to blockchain
 */
export interface TicketBlockchainAnchorResult {
  success: boolean;
  ticketId: string;
  anchorHash: string | null;
  transactionId: string | null;
  message: string;
}

/**
 * TicketBlockchainVerificationResult
 * Result of verifying a ticket's blockchain anchor
 */
export interface TicketBlockchainVerificationResult {
  isValid: boolean;
  ticketId: string;
  anchorHash: string;
  message: string;
  verifiedAt: Date;
}
