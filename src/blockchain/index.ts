/**
 * Blockchain Module Barrel Export
 * Re-exports all public blockchain components
 */

// Module
export { BlockchainModule } from './blockchain.module';

// Service
export { BlockchainService } from './blockchain.service';

// Enums
export {
  BlockchainAnchorType,
  BlockchainAnchorStatus,
  BlockchainProvider,
} from './enums';

// Interfaces
export type {
  BlockchainAnchorResult,
  BlockchainAnchorRequest,
  BlockchainAnchorRecord,
  BlockchainVerificationRequest,
  BlockchainVerificationResult,
  IBlockchainProvider,
} from './interfaces';

// Config
export type { BlockchainConfig, BlockchainModuleConfig } from './config/blockchain.config';
