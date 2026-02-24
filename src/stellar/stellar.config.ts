export interface StellarConfig {
  /** Stellar Horizon server URL */
  horizonUrl: string;
  /** Platform receiving address for payments */
  platformAddress: string;
  /** Network passphrase (testnet or public) */
  networkPassphrase: string;
  /** Cursor storage key for resuming stream */
  cursorStorageKey: string;
  /** Maximum retry attempts for stream reconnection */
  maxRetries: number;
  /** Initial backoff delay in milliseconds */
  initialBackoffMs: number;
}

export const defaultStellarConfig: StellarConfig = {
  horizonUrl: 'https://horizon-testnet.stellar.org',
  platformAddress: process.env.STELLAR_PLATFORM_ADDRESS || '',
  networkPassphrase: 'Test SDF Network ; September 2015',
  cursorStorageKey: 'stellar_payment_cursor',
  maxRetries: 5,
  initialBackoffMs: 1000,
};
