import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { BlockchainModuleConfig } from './config/blockchain.config';

/**
 * BlockchainModule
 * Provides blockchain anchoring and verification capabilities
 * Decoupled from specific blockchain implementations
 */
@Module({
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {
  /**
   * Register blockchain module synchronously
   */
  static register(config: BlockchainModuleConfig): DynamicModule {
    return {
      module: BlockchainModule,
      providers: [
        {
          provide: 'BLOCKCHAIN_CONFIG',
          useValue: config.config,
        },
        BlockchainService,
      ],
      exports: [BlockchainService],
      global: config.isGlobal ?? false,
    };
  }

  /**
   * Register blockchain module asynchronously
   * Allows configuration from environment variables or external services
   */
  static registerAsync(options: {
    isGlobal?: boolean;
    imports?: any[];
    inject?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<BlockchainModuleConfig> | BlockchainModuleConfig;
  }): DynamicModule {
    return {
      module: BlockchainModule,
      imports: options.imports || [ConfigModule],
      providers: [
        {
          provide: 'BLOCKCHAIN_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        BlockchainService,
      ],
      exports: [BlockchainService],
      global: options.isGlobal ?? false,
    };
  }
}
