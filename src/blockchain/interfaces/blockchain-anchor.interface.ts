import { BlockchainAnchorType, BlockchainAnchorStatus } from '../enums';

/**
 * BlockchainAnchorResult
 * Response from blockchain anchoring operation
 */
export interface BlockchainAnchorResult {
  success: boolean;
  anchorHash: string | null;
  transactionId: string | null;
  timestamp: Date;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * BlockchainAnchorRequest
 * Request to anchor data to the blockchain
 */
export interface BlockchainAnchorRequest {
  type: BlockchainAnchorType;
  entityId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * BlockchainAnchorRecord
 * Stored record of an anchoring operation
 */
export interface BlockchainAnchorRecord {
  id: string;
  type: BlockchainAnchorType;
  entityId: string;
  anchorHash: string;
  transactionId: string;
  status: BlockchainAnchorStatus;
  createdAt: Date;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * BlockchainVerificationRequest
 * Request to verify data anchored to blockchain
 */
export interface BlockchainVerificationRequest {
  anchorHash: string;
  data: Record<string, any>;
}

/**
 * BlockchainVerificationResult
 * Result of blockchain verification operation
 */
export interface BlockchainVerificationResult {
  isValid: boolean;
  anchorHash: string;
  timestamp: Date;
  message: string;
  transactionId?: string;
}
