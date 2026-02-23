import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from 'stellar-sdk';

/**
 * StellarService
 * Handles communication with the Stellar blockchain, specifically making outbound payments
 */
@Injectable()
export class StellarService {
    private readonly logger = new Logger(StellarService.name);
    public server: StellarSdk.Server; // Public for testing purposes

    constructor(private readonly configService: ConfigService) {
        // Default to testnet if not explicitly provided
        const horizonUrl = this.configService.get<string>('blockchain.horizonUrl') || 'https://horizon-testnet.stellar.org';
        this.server = new StellarSdk.Server(horizonUrl);
    }

    /**
     * Send a refund payment in XLM to the destination address
     * @param destinationAddress Originating wallet address
     * @param amountXLM Amount in XLM to refund
     * @param orderId Internal order reference mapping the refund
     * @returns The transaction hash of the successful payment
     */
    async sendRefund(destinationAddress: string, amountXLM: number, orderId: string): Promise<string> {
        const secretKey = this.configService.get<string>('stellarSecretKey');
        if (!secretKey) {
            throw new Error('STELLAR_SECRET_KEY is not configured on the platform');
        }

        const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
        const sourcePublicKey = sourceKeypair.publicKey();

        let retries = 0;
        const maxRetries = 1;

        while (true) {
            try {
                // Load account to get sequence number
                const account = await this.server.loadAccount(sourcePublicKey);

                let feeStrategy = StellarSdk.BASE_FEE;
                try {
                    // Use minimum base fee — don't hardcode fee amounts if the network supports it
                    feeStrategy = await this.server.fetchBaseFee();
                } catch (e) {
                    this.logger.warn('Could not fetch base fee, defaulting to standard BASE_FEE');
                }

                const transaction = new StellarSdk.TransactionBuilder(account, { fee: feeStrategy.toString() })
                    .addOperation(StellarSdk.Operation.payment({
                        destination: destinationAddress,
                        asset: StellarSdk.Asset.native(),
                        amount: amountXLM.toString()
                    }))
                    .addMemo(StellarSdk.Memo.text(`Ref-${orderId}`.substring(0, 28))) // Max 28 bytes
                    .setTimeout(30)
                    .build();

                transaction.sign(sourceKeypair);

                const response = await this.server.submitTransaction(transaction);
                this.logger.log(`Refund transaction successful: ${response.hash}`);
                return response.hash;
            } catch (error: any) {
                if (error?.response?.status === 429 && retries < maxRetries) {
                    this.logger.warn('RATE_LIMIT_EXCEEDED from Horizon. Retrying in 2 seconds...');
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                this.logger.error(`Failed to submit stellar refund: ${error?.message || error}`);
                throw error;
            }
        }
    }
}
