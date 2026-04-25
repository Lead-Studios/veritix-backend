import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from 'stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private server: StellarSdk.Server;
  private networkPassphrase: string;
  private receivingAddress: string | null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.receivingAddress = this.configService.get<string>(
      'STELLAR_RECEIVING_ADDRESS',
      null,
    );

    // Validate receiving address if provided
    if (this.receivingAddress) {
      if (!StellarSdk.StrKey.isValidEd25519PublicKey(this.receivingAddress)) {
        throw new Error(
          `Invalid STELLAR_RECEIVING_ADDRESS: ${this.receivingAddress}`,
        );
      }
    }

    // Configure Horizon server
    const horizonUrl =
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

    this.server = new StellarSdk.Server(horizonUrl);
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getReceivingAddress(): string | null {
    return this.receivingAddress;
  }

  generateMemo(orderId: string): string {
    // Use first 8 characters of the orderId as memo
    return orderId.substring(0, 8);
  }

  getServer(): StellarSdk.Server {
    return this.server;
  }
}
