import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import * as StellarSdk from 'stellar-sdk';
import { Logger } from '@nestjs/common';

// Mocking StellarSdk completely for isolated tests
jest.mock('stellar-sdk', () => {
    const actualStellarSdk = jest.requireActual('stellar-sdk');
    return {
        ...actualStellarSdk,
        Server: jest.fn().mockImplementation(() => ({
            loadAccount: jest.fn(),
            fetchBaseFee: jest.fn(),
            submitTransaction: jest.fn(),
        })),
        Keypair: {
            fromSecret: jest.fn(),
        },
        TransactionBuilder: jest.fn().mockImplementation(() => ({
            addOperation: jest.fn().mockReturnThis(),
            addMemo: jest.fn().mockReturnThis(),
            setTimeout: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnValue({ sign: jest.fn() }),
        })),
        Operation: {
            payment: jest.fn(),
        },
        Asset: {
            native: jest.fn(),
        },
        Memo: {
            text: jest.fn(),
        },
    };
});

describe('StellarService', () => {
    let service: StellarService;
    let configService: ConfigService;

    const mockKeypair = {
        publicKey: jest.fn().mockReturnValue('GBMOCKPUBLICKEY...'),
        secret: jest.fn().mockReturnValue('SAMOCKSECRETKEY...'),
    };

    beforeEach(async () => {
        (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StellarService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'stellarSecretKey') return 'SAMOCKSECRETKEY...';
                            if (key === 'blockchain.horizonUrl') return 'https://horizon-testnet.stellar.org';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<StellarService>(StellarService);
        configService = module.get<ConfigService>(ConfigService);

        // Disable logger output for tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendRefund', () => {
        it('should submit a refund transaction successfully', async () => {
            // Mock successful server execution
            const mockAccount = { sequenceNumber: () => '123' };
            (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
            (service.server.fetchBaseFee as jest.Mock).mockResolvedValue(100);
            (service.server.submitTransaction as jest.Mock).mockResolvedValue({
                hash: 'mock-tx-hash-123',
            });

            const hash = await service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123');

            expect(hash).toBe('mock-tx-hash-123');
            expect(service.server.loadAccount).toHaveBeenCalledWith('GBMOCKPUBLICKEY...');
            expect(service.server.submitTransaction).toHaveBeenCalledTimes(1);
        });

        it('should retry once on RATE_LIMIT_EXCEEDED (429) then succeed', async () => {
            const mockAccount = { sequenceNumber: () => '123' };
            (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
            (service.server.fetchBaseFee as jest.Mock).mockResolvedValue(100);

            const rateLimitError = new Error('Rate limit');
            (rateLimitError as any).response = { status: 429 };

            (service.server.submitTransaction as jest.Mock)
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({ hash: 'mock-tx-hash-456' });

            // Spying on setTimeout in actual code might be tricky, we just check execution order
            const hash = await service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123');

            expect(hash).toBe('mock-tx-hash-456');
            expect(service.server.submitTransaction).toHaveBeenCalledTimes(2);
        });

        it('should fail if RATE_LIMIT_EXCEEDED occurs twice', async () => {
            const mockAccount = { sequenceNumber: () => '123' };
            (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
            (service.server.fetchBaseFee as jest.Mock).mockResolvedValue(100);

            const rateLimitError = new Error('Rate limit');
            (rateLimitError as any).response = { status: 429 };

            (service.server.submitTransaction as jest.Mock)
                .mockRejectedValueOnce(rateLimitError)
                .mockRejectedValueOnce(rateLimitError);

            await expect(service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123')).rejects.toThrow(rateLimitError);
            expect(service.server.submitTransaction).toHaveBeenCalledTimes(2);
        });

        it('should throw an error without retrying on other errors', async () => {
            const mockAccount = { sequenceNumber: () => '123' };
            (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
            (service.server.fetchBaseFee as jest.Mock).mockResolvedValue(100);

            const otherError = new Error('Bad Request');
            (otherError as any).response = { status: 400 };

            (service.server.submitTransaction as jest.Mock).mockRejectedValueOnce(otherError);

            await expect(service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123')).rejects.toThrow(otherError);
            expect(service.server.submitTransaction).toHaveBeenCalledTimes(1);
        });
    });
});
