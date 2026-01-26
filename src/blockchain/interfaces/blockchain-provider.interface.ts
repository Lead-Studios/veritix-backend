import { BlockchainVerificationRequest, BlockchainVerificationResult, BlockchainAnchorRequest, BlockchainAnchorResult } from './blockchain-anchor.interface';

/**
 * IBlockchainProvider
 * Abstract interface for blockchain providers
 * Implementations should handle provider-specific logic (Stellar, Ethereum, etc.)
 */
export interface IBlockchainProvider {
  /**
   * Initialize the provider with configuration
   */
  initialize(): Promise<void>;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;

  /**
   * Anchor data to blockchain
   * @param request - Anchor request with data and metadata
   * @returns Anchor result with hash and transaction ID
   */
  anchor(request: BlockchainAnchorRequest): Promise<BlockchainAnchorResult>;

  /**
   * Verify data anchored to blockchain
   * @param request - Verification request with anchor hash and data
   * @returns Verification result indicating validity
   */
  verify(request: BlockchainVerificationRequest): Promise<BlockchainVerificationResult>;

  /**
   * Get transaction status
   * @param transactionId - The transaction ID to check
   * @returns Transaction status and details
   */
  getTransactionStatus(transactionId: string): Promise<{
    status: string;
    confirmations: number;
    timestamp?: Date;
  }>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Get provider configuration (non-sensitive)
   */
  getConfig(): Record<string, any>;
}
