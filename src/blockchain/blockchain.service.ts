import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import type {
  BlockchainAnchorRequest,
  BlockchainAnchorResult,
  BlockchainVerificationRequest,
  BlockchainVerificationResult,
  IBlockchainProvider,
} from './interfaces';
import { BlockchainAnchorStatus } from './enums';

/**
 * BlockchainService
 * Abstract service for blockchain operations
 * Provides a unified interface for anchoring and verification
 * Implementations are decoupled from specific blockchain providers
 */
@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: IBlockchainProvider | null = null;

  constructor(
    @Optional() @Inject('BLOCKCHAIN_PROVIDER') provider?: IBlockchainProvider | null,
  ) {
    this.provider = provider || null;
  }

  /**
   * Initialize the blockchain service
   */
  async onModuleInit(): Promise<void> {
    if (this.provider && this.provider.isReady()) {
      this.logger.log(
        `Blockchain provider initialized: ${this.provider.getProviderName()}`,
      );
    } else {
      this.logger.warn('Blockchain provider not initialized. Anchoring will be disabled.');
    }
  }

  /**
   * Check if blockchain anchoring is enabled
   */
  isEnabled(): boolean {
    return this.provider !== null && this.provider.isReady();
  }

  /**
   * Anchor data to blockchain
   * @param request - The anchor request
   * @returns The anchor result with hash and transaction details
   */
  async anchor(request: BlockchainAnchorRequest): Promise<BlockchainAnchorResult> {
    if (!this.isEnabled()) {
      this.logger.warn(
        `Blockchain anchoring disabled. Would anchor ${request.type} for entity ${request.entityId}`,
      );
      return {
        success: false,
        anchorHash: null,
        transactionId: null,
        timestamp: new Date(),
        message: 'Blockchain anchoring is not enabled',
      };
    }

    try {
      this.logger.debug(
        `Anchoring ${request.type} for entity ${request.entityId} to blockchain`,
      );
      const result = await this.provider!.anchor(request);
      
      if (result.success) {
        this.logger.log(
          `Successfully anchored ${request.type} ${request.entityId}. Hash: ${result.anchorHash}`,
        );
      } else {
        this.logger.error(
          `Failed to anchor ${request.type} ${request.entityId}: ${result.message}`,
        );
      }
      
      return result;
    } catch (error) {
      this.logger.error(
        `Error anchoring ${request.type} ${request.entityId}:`,
        error,
      );
      return {
        success: false,
        anchorHash: null,
        transactionId: null,
        timestamp: new Date(),
        message: `Anchoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify data anchored to blockchain
   * @param request - The verification request
   * @returns The verification result
   */
  async verify(
    request: BlockchainVerificationRequest,
  ): Promise<BlockchainVerificationResult> {
    if (!this.isEnabled()) {
      this.logger.warn(
        `Blockchain verification disabled. Would verify hash ${request.anchorHash}`,
      );
      return {
        isValid: false,
        anchorHash: request.anchorHash,
        timestamp: new Date(),
        message: 'Blockchain verification is not enabled',
      };
    }

    try {
      this.logger.debug(`Verifying anchor hash: ${request.anchorHash}`);
      const result = await this.provider!.verify(request);
      
      if (result.isValid) {
        this.logger.log(`Successfully verified anchor hash: ${request.anchorHash}`);
      } else {
        this.logger.warn(`Anchor verification failed for hash: ${request.anchorHash}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error verifying anchor hash ${request.anchorHash}:`, error);
      return {
        isValid: false,
        anchorHash: request.anchorHash,
        timestamp: new Date(),
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get transaction status from blockchain
   * @param transactionId - The transaction ID
   * @returns Transaction status details
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: string;
    confirmations: number;
    timestamp?: Date;
  } | null> {
    if (!this.isEnabled()) {
      this.logger.warn(
        `Blockchain transaction lookup disabled. Would check transaction ${transactionId}`,
      );
      return null;
    }

    try {
      const status = await this.provider!.getTransactionStatus(transactionId);
      return status;
    } catch (error) {
      this.logger.error(`Error getting transaction status for ${transactionId}:`, error);
      return null;
    }
  }

  /**
   * Get blockchain provider information
   */
  getProviderInfo(): {
    name: string;
    enabled: boolean;
    config: Record<string, any> | null;
  } {
    return {
      name: this.provider?.getProviderName() || 'None',
      enabled: this.isEnabled(),
      config: this.provider?.getConfig() || null,
    };
  }

  /**
   * Set blockchain provider (for testing or runtime changes)
   */
  setProvider(provider: IBlockchainProvider | null): void {
    this.provider = provider;
  }
}
