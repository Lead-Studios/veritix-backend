import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private receivingAddress: string | null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.receivingAddress =
      this.configService.get<string>('STELLAR_RECEIVING_ADDRESS') ?? null;

    if (this.receivingAddress) {
      if (!StellarSdk.StrKey.isValidEd25519PublicKey(this.receivingAddress)) {
        throw new Error(`Invalid STELLAR_RECEIVING_ADDRESS: ${this.receivingAddress}`);
      }
    }

    const horizonUrl =
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

    this.server = new StellarSdk.Horizon.Server(horizonUrl);
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getReceivingAddress(): string | null {
    return this.receivingAddress;
  }

  generateMemo(orderId: string): string {
    return orderId.substring(0, 8);
  }

  getServer(): StellarSdk.Horizon.Server {
    return this.server;
  }
}
