import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { Order } from '../orders/entities/orders.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/email/email.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import * as StellarSdk from 'stellar-sdk';

jest.mock('stellar-sdk', () => ({
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015',
  },
  StrKey: { isValidEd25519PublicKey: jest.fn().mockReturnValue(true) },
  Server: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue(''),
}));

const mockOrderRepo = { findOne: jest.fn(), save: jest.fn() };
const mockTicketRepo = {};
const mockUserRepo = { findOne: jest.fn() };
const mockEmailService = { sendEmail: jest.fn() };

const mockConfigService = {
  get: jest.fn((key: string, def?: unknown) => {
    const map: Record<string, unknown> = {
      STELLAR_NETWORK: 'testnet',
      STELLAR_RECEIVING_ADDRESS: null,
    };
    return key in map ? map[key] : def;
  }),
};

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();
  });

  describe('generateMemo', () => {
    it('returns deterministic 8-char prefix of UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(service.generateMemo(uuid)).toBe('550e8400');
      expect(service.generateMemo(uuid)).toBe(service.generateMemo(uuid));
    });

    it('always returns exactly 8 characters', () => {
      expect(service.generateMemo('abcdefghijklmnop')).toHaveLength(8);
    });
  });

  describe('getNetworkPassphrase', () => {
    it('returns testnet passphrase when STELLAR_NETWORK=testnet', () => {
      expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.TESTNET);
    });

    it('returns mainnet passphrase when STELLAR_NETWORK=mainnet', () => {
      mockConfigService.get.mockImplementation((key: string, def?: unknown) => {
        if (key === 'STELLAR_NETWORK') return 'mainnet';
        return def ?? null;
      });
      service.onModuleInit();
      expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.PUBLIC);
    });
  });

  describe('processConfirmedPayment', () => {
    const baseOrder = {
      id: 'order-1',
      userId: 'user-1',
      stellarMemo: 'abc12345',
      stellarTxHash: null,
      totalAmountXLM: 10,
      status: OrderStatus.PENDING,
      tickets: [],
    };

    it('confirms order and saves on valid payment', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...baseOrder });
      mockOrderRepo.save.mockResolvedValue({});

      await service.processConfirmedPayment('tx1', 'GABC', 'abc12345', '10');

      expect(mockOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.PAID,
          stellarTxHash: 'tx1',
        }),
      );
    });

    it('skips when memo is unknown', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await service.processConfirmedPayment('tx1', 'GABC', 'unknown1', '10');

      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('skips duplicate txHash (idempotent)', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...baseOrder,
        stellarTxHash: 'tx1',
      });

      await service.processConfirmedPayment('tx1', 'GABC', 'abc12345', '10');

      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('leaves order PENDING on underpayment', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...baseOrder });

      await service.processConfirmedPayment('tx1', 'GABC', 'abc12345', '5');

      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });
  });
});
