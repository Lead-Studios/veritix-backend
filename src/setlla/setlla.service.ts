import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Networks, StrKey } from 'stellar-sdk';
import * as crypto from 'crypto';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly receivingAddress: string;
  private readonly network: string;

  constructor(private readonly configService: ConfigService) {
    this.receivingAddress = this.configService.get<string>('STELLAR_RECEIVING_ADDRESS');
    this.network = this.configService.get<string>('STELLAR_NETWORK');
  }

  onModuleInit() {
    // ✅ Validate network
    if (!['testnet', 'mainnet'].includes(this.network)) {
      throw new Error(
        'Invalid STELLAR_NETWORK. Must be "testnet" or "mainnet"',
      );
    }

    // ✅ Validate receiving address
    if (!StrKey.isValidEd25519PublicKey(this.receivingAddress)) {
      throw new Error('Invalid STELLAR_RECEIVING_ADDRESS');
    }
  }

  getPaymentAddress(orderId: string): {
    destinationAddress: string;
    memo: string;
    network: string;
  } {
    const memo = this.generateMemo(orderId);

    return {
      destinationAddress: this.receivingAddress,
      memo,
      network: this.network,
    };
  }

  generateMemo(orderId: string): string {
    // deterministic 8-char hex from UUID
    return orderId.replace(/-/g, '').slice(0, 8);
  }

  getNetworkPassphrase(): string {
    return this.network === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET;
  }
}