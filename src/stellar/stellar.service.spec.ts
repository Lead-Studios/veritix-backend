import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Logger } from '@nestjs/common';
import { Order } from '../orders/orders.entity';
import { StellarCursor } from './entities/stellar-cursor.entity';
import { DataSource } from 'typeorm';
import { TicketService } from '../tickets-inventory/services/ticket.service';
import { TicketTypeService } from '../tickets-inventory/services/ticket-type.service';

// Mocking @stellar/stellar-sdk completely for isolated tests
jest.mock('@stellar/stellar-sdk', () => {
  const actualStellarSdk = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actualStellarSdk,
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn(),
        feeStats: jest.fn(),
        submitTransaction: jest.fn(),
        payments: jest.fn().mockReturnValue({
          forAccount: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          cursor: jest.fn().mockReturnThis(),
          stream: jest.fn(),
        }),
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnThis(),
          call: jest.fn(),
        }),
      })),
    },
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
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
    BASE_FEE: '100',
  };
});

const mockOrderRepo = { findOne: jest.fn(), update: jest.fn() };
const mockCursorRepo = { findOne: jest.fn(), upsert: jest.fn() };
const mockDataSource = {};
const mockTicketService = {};
const mockTicketTypeService = {};

describe('StellarService', () => {
  let service: StellarService;
  let configService: ConfigService;

  const mockKeypair = {
    publicKey: jest.fn().mockReturnValue('GBMOCKPUBLICKEY...'),
    sign: jest.fn(),
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
              if (key === 'blockchain.horizonUrl')
                return 'https://horizon-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'testnet';
              if (key === 'STELLAR_RECEIVING_ADDRESS')
                return 'GBMOCKRECEIVINGADDRESS';
              return null;
            }),
          },
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(StellarCursor), useValue: mockCursorRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TicketService, useValue: mockTicketService },
        { provide: TicketTypeService, useValue: mockTicketTypeService },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    configService = module.get<ConfigService>(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // generateMemo
  // -----------------------------------------------------------------------
  describe('generateMemo', () => {
    it('should return the first 8 chars of the UUID (dashes stripped, uppercase)', () => {
      const orderId = '3f9a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c';
      const memo = service.generateMemo(orderId);
      // 3f9a2b1c4d5e6f7a8b9c0d1e2f3a4b5c → first 8 = '3F9A2B1C'
      expect(memo).toBe('3F9A2B1C');
    });

    it('should produce the same memo for the same orderId (reproducible)', () => {
      const orderId = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
      expect(service.generateMemo(orderId)).toBe(service.generateMemo(orderId));
    });

    it('should produce different memos for different orderIds', () => {
      const memo1 = service.generateMemo('aaaabbbb-0000-0000-0000-000000000000');
      const memo2 = service.generateMemo('bbbbcccc-0000-0000-0000-000000000000');
      expect(memo1).not.toBe(memo2);
    });

    it('should always return exactly 8 characters', () => {
      const memo = service.generateMemo('12345678-1234-1234-1234-123456789abc');
      expect(memo).toHaveLength(8);
    });
  });

  // -----------------------------------------------------------------------
  // getPaymentAddress
  // -----------------------------------------------------------------------
  describe('getPaymentAddress', () => {
    it('should return destinationAddress, memo, and network', () => {
      const orderId = '3f9a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c';
      const result = service.getPaymentAddress(orderId);

      expect(result.destinationAddress).toBe('GBMOCKRECEIVINGADDRESS');
      expect(result.memo).toBe(service.generateMemo(orderId));
      expect(result.network).toBe('testnet');
    });

    it('should throw if no receiving address is configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      // Override platformAddress too
      (service as any).config.platformAddress = '';
      expect(() => service.getPaymentAddress('any-id')).toThrow(
        'STELLAR_RECEIVING_ADDRESS is not configured',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getNetworkPassphrase
  // -----------------------------------------------------------------------
  describe('getNetworkPassphrase', () => {
    it('should return testnet passphrase by default', () => {
      jest.spyOn(configService, 'get').mockReturnValue('testnet');
      expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.TESTNET);
    });

    it('should return mainnet passphrase when STELLAR_NETWORK=mainnet', () => {
      jest.spyOn(configService, 'get').mockReturnValue('mainnet');
      expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.PUBLIC);
    });
  });

  // -----------------------------------------------------------------------
  // sendRefund
  // -----------------------------------------------------------------------
  describe('sendRefund', () => {
    it('should submit a refund transaction successfully', async () => {
      const mockAccount = { sequenceNumber: () => '123', accountId: () => 'G...' };
      (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
      (service.server.feeStats as jest.Mock).mockResolvedValue({
        last_ledgers_base_fee_stats: { min: '100' },
      });
      (service.server.submitTransaction as jest.Mock).mockResolvedValue({
        hash: 'mock-tx-hash-123',
      });

      const hash = await service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123');
      expect(hash).toBe('mock-tx-hash-123');
    });

    it('should retry once on RATE_LIMIT_EXCEEDED (429) then succeed', async () => {
      const mockAccount = { sequenceNumber: () => '123' };
      (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
      (service.server.feeStats as jest.Mock).mockResolvedValue({
        last_ledgers_base_fee_stats: { min: '100' },
      });

      const rateLimitError = new Error('Rate limit');
      (rateLimitError as any).response = { status: 429 };

      (service.server.submitTransaction as jest.Mock)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ hash: 'mock-tx-hash-456' });

      const hash = await service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123');
      expect(hash).toBe('mock-tx-hash-456');
      expect(service.server.submitTransaction).toHaveBeenCalledTimes(2);
    });

    it('should fail if RATE_LIMIT_EXCEEDED occurs twice', async () => {
      const mockAccount = { sequenceNumber: () => '123' };
      (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
      (service.server.feeStats as jest.Mock).mockResolvedValue({
        last_ledgers_base_fee_stats: { min: '100' },
      });

      const rateLimitError = new Error('Rate limit');
      (rateLimitError as any).response = { status: 429 };

      (service.server.submitTransaction as jest.Mock)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError);

      await expect(
        service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123'),
      ).rejects.toThrow(rateLimitError);
      expect(service.server.submitTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw without retrying on other errors', async () => {
      const mockAccount = { sequenceNumber: () => '123' };
      (service.server.loadAccount as jest.Mock).mockResolvedValue(mockAccount);
      (service.server.feeStats as jest.Mock).mockResolvedValue({
        last_ledgers_base_fee_stats: { min: '100' },
      });

      const otherError = new Error('Bad Request');
      (otherError as any).response = { status: 400 };

      (service.server.submitTransaction as jest.Mock).mockRejectedValueOnce(otherError);

      await expect(
        service.sendRefund('GDESTINATIONADDRESS', 10, 'order-123'),
      ).rejects.toThrow(otherError);
      expect(service.server.submitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});