/**
 * BlockchainConfig
 * Configuration interface for blockchain module initialization
 */
export interface BlockchainConfig {
  provider: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  network?: string;
  account?: string;
  passphrase?: string;
  horizonUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  [key: string]: any;
}

/**
 * BlockchainModuleConfig
 * Configuration for the BlockchainModule
 */
export interface BlockchainModuleConfig {
  isGlobal?: boolean;
  config: BlockchainConfig;
}
