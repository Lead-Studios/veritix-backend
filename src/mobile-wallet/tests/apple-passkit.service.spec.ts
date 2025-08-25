import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApplePassKitService } from '../services/apple-passkit.service';
import { WalletPass, PassType, PassStatus } from '../entities/wallet-pass.entity';
import { PassAnalytics } from '../entities/pass-analytics.entity';
import { QRCodeService } from '../services/qr-code.service';

describe('ApplePassKitService', () => {
  let service: ApplePassKitService;
  let passRepository: Repository<WalletPass>;
  let analyticsRepository: Repository<PassAnalytics>;
  let qrCodeService: QRCodeService;
  let configService: ConfigService;

  const mockPassRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockAnalyticsRepository = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockQRCodeService = {
    generateQRCodeData: jest.fn(),
    generateQRCodeImage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplePassKitService,
        {
          provide: getRepositoryToken(WalletPass),
          useValue: mockPassRepository,
        },
        {
          provide: getRepositoryToken(PassAnalytics),
          useValue: mockAnalyticsRepository,
        },
        {
          provide: QRCodeService,
          useValue: mockQRCodeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ApplePassKitService>(ApplePassKitService);
    passRepository = module.get<Repository<WalletPass>>(getRepositoryToken(WalletPass));
    analyticsRepository = module.get<Repository<PassAnalytics>>(getRepositoryToken(PassAnalytics));
    qrCodeService = module.get<QRCodeService>(QRCodeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePass', () => {
    it('should generate an Apple Wallet pass successfully', async () => {
      const passData = {
        userId: 'user-123',
        eventId: 'event-123',
        ticketId: 'ticket-123',
        templateId: 'template-123',
        passData: {
          eventName: 'Test Event',
          venueName: 'Test Venue',
          eventDate: new Date(),
          seatInfo: 'A1',
        },
      };

      const mockPass = {
        id: 'pass-123',
        passType: PassType.APPLE_WALLET,
        status: PassStatus.ACTIVE,
        ...passData,
      };

      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          APPLE_PASS_TYPE_IDENTIFIER: 'pass.com.veritix.event',
          APPLE_TEAM_IDENTIFIER: 'TEAM123',
          APPLE_WEB_SERVICE_URL: 'https://api.veritix.com/wallet',
        };
        return config[key];
      });

      mockQRCodeService.generateQRCodeData.mockResolvedValue({
        data: 'qr-data-123',
        signature: 'qr-signature',
        expiresAt: new Date(),
      });

      mockPassRepository.create.mockReturnValue(mockPass);
      mockPassRepository.save.mockResolvedValue(mockPass);

      const result = await service.generatePass(passData);

      expect(result).toEqual({
        success: true,
        passId: 'pass-123',
        downloadUrl: expect.stringContaining('/passes/pass-123/download'),
      });

      expect(mockPassRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passType: PassType.APPLE_WALLET,
          status: PassStatus.ACTIVE,
        })
      );
      expect(mockPassRepository.save).toHaveBeenCalled();
      expect(mockAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should handle pass generation failure', async () => {
      const passData = {
        userId: 'user-123',
        eventId: 'event-123',
        ticketId: 'ticket-123',
        templateId: 'template-123',
        passData: {},
      };

      mockPassRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.generatePass(passData)).rejects.toThrow('Database error');
    });
  });

  describe('updatePass', () => {
    it('should update an existing pass successfully', async () => {
      const passId = 'pass-123';
      const updateData = {
        eventName: 'Updated Event Name',
        eventDate: new Date(),
      };

      const mockPass = {
        id: passId,
        passType: PassType.APPLE_WALLET,
        status: PassStatus.ACTIVE,
        passData: { eventName: 'Original Event' },
        serialNumber: 'serial-123',
        authenticationToken: 'auth-token',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updatePass(passId, updateData, 'FIELD_UPDATE');

      expect(result).toEqual({
        success: true,
        passId,
        serialNumber: 'serial-123',
        lastUpdated: expect.any(Date),
      });

      expect(mockPassRepository.update).toHaveBeenCalledWith(
        passId,
        expect.objectContaining({
          passData: expect.objectContaining(updateData),
          lastUpdated: expect.any(Date),
        })
      );
      expect(mockAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should return error for non-existent pass', async () => {
      const passId = 'non-existent';
      mockPassRepository.findOne.mockResolvedValue(null);

      const result = await service.updatePass(passId, {}, 'FIELD_UPDATE');

      expect(result).toEqual({
        success: false,
        error: 'Pass not found',
      });
    });
  });

  describe('revokePass', () => {
    it('should revoke a pass successfully', async () => {
      const passId = 'pass-123';
      const reason = 'Event cancelled';

      const mockPass = {
        id: passId,
        status: PassStatus.ACTIVE,
        serialNumber: 'serial-123',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.revokePass(passId, reason);

      expect(result).toEqual({
        success: true,
        passId,
        revokedAt: expect.any(Date),
      });

      expect(mockPassRepository.update).toHaveBeenCalledWith(
        passId,
        expect.objectContaining({
          status: PassStatus.REVOKED,
          revokedAt: expect.any(Date),
          metadata: expect.objectContaining({
            revokeReason: reason,
          }),
        })
      );
    });
  });

  describe('getPassPackage', () => {
    it('should generate pass package successfully', async () => {
      const passId = 'pass-123';

      const mockPass = {
        id: passId,
        passType: PassType.APPLE_WALLET,
        passData: {
          eventName: 'Test Event',
          venueName: 'Test Venue',
        },
        qrCodeData: 'qr-data-123',
        serialNumber: 'serial-123',
        authenticationToken: 'auth-token',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      // Mock file system operations
      jest.spyOn(service as any, 'createPassPackage').mockResolvedValue(Buffer.from('mock-package'));

      const result = await service.getPassPackage(passId);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockAnalyticsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPassId: passId,
          eventType: 'PASS_DOWNLOADED',
        })
      );
    });

    it('should handle missing pass', async () => {
      const passId = 'non-existent';
      mockPassRepository.findOne.mockResolvedValue(null);

      await expect(service.getPassPackage(passId)).rejects.toThrow('Pass not found');
    });
  });

  describe('handleWebServiceRequest', () => {
    it('should handle device registration', async () => {
      const deviceLibraryIdentifier = 'device-123';
      const passTypeIdentifier = 'pass.com.veritix.event';
      const serialNumber = 'serial-123';
      const authorizationToken = 'auth-token';

      const mockPass = {
        id: 'pass-123',
        serialNumber,
        authenticationToken: authorizationToken,
        status: PassStatus.ACTIVE,
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.handleWebServiceRequest(
        'registerDevice',
        {
          deviceLibraryIdentifier,
          passTypeIdentifier,
          serialNumber,
          authorizationToken,
        }
      );

      expect(result).toEqual({
        success: true,
        statusCode: 201,
      });

      expect(mockPassRepository.update).toHaveBeenCalledWith(
        'pass-123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            registeredDevices: expect.arrayContaining([deviceLibraryIdentifier]),
          }),
        })
      );
    });

    it('should handle unauthorized requests', async () => {
      const result = await service.handleWebServiceRequest(
        'registerDevice',
        {
          deviceLibraryIdentifier: 'device-123',
          passTypeIdentifier: 'pass.com.veritix.event',
          serialNumber: 'serial-123',
          authorizationToken: 'invalid-token',
        }
      );

      expect(result).toEqual({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
      });
    });
  });

  describe('getUpdatablePasses', () => {
    it('should return passes that need updates', async () => {
      const deviceLibraryIdentifier = 'device-123';
      const passTypeIdentifier = 'pass.com.veritix.event';
      const passesUpdatedSince = '1234567890';

      const mockPasses = [
        {
          id: 'pass-1',
          serialNumber: 'serial-1',
          lastUpdated: new Date('2023-01-02'),
        },
        {
          id: 'pass-2',
          serialNumber: 'serial-2',
          lastUpdated: new Date('2023-01-03'),
        },
      ];

      mockPassRepository.find.mockResolvedValue(mockPasses);

      const result = await service.getUpdatablePasses(
        deviceLibraryIdentifier,
        passTypeIdentifier,
        passesUpdatedSince
      );

      expect(result).toEqual({
        serialNumbers: ['serial-1', 'serial-2'],
        lastUpdated: expect.any(String),
      });
    });

    it('should return empty result when no updates available', async () => {
      mockPassRepository.find.mockResolvedValue([]);

      const result = await service.getUpdatablePasses(
        'device-123',
        'pass.com.veritix.event',
        '9999999999'
      );

      expect(result).toEqual({
        serialNumbers: [],
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('logWebServiceRequest', () => {
    it('should log web service requests', async () => {
      const logData = {
        logs: ['Log entry 1', 'Log entry 2'],
      };

      await service.logWebServiceRequest(logData);

      // Verify that logging doesn't throw errors
      expect(true).toBe(true);
    });
  });
});
