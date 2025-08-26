import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { GooglePayService } from '../services/google-pay.service';
import { WalletPass, PassType, PassStatus } from '../entities/wallet-pass.entity';
import { PassAnalytics } from '../entities/pass-analytics.entity';
import { QRCodeService } from '../services/qr-code.service';
import { of } from 'rxjs';

describe('GooglePayService', () => {
  let service: GooglePayService;
  let passRepository: Repository<WalletPass>;
  let analyticsRepository: Repository<PassAnalytics>;
  let qrCodeService: QRCodeService;
  let httpService: HttpService;
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

  const mockHttpService = {
    axiosRef: {
      post: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePayService,
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
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GooglePayService>(GooglePayService);
    passRepository = module.get<Repository<WalletPass>>(getRepositoryToken(WalletPass));
    analyticsRepository = module.get<Repository<PassAnalytics>>(getRepositoryToken(PassAnalytics));
    qrCodeService = module.get<QRCodeService>(QRCodeService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePass', () => {
    it('should generate a Google Pay pass successfully', async () => {
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
        passType: PassType.GOOGLE_PAY,
        status: PassStatus.ACTIVE,
        ...passData,
      };

      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          GOOGLE_PAY_ISSUER_ID: 'issuer-123',
          GOOGLE_PAY_SERVICE_ACCOUNT_EMAIL: 'service@example.com',
          GOOGLE_PAY_SERVICE_ACCOUNT_KEY: 'private-key',
        };
        return config[key];
      });

      mockQRCodeService.generateQRCodeData.mockResolvedValue({
        data: 'qr-data-123',
        signature: 'qr-signature',
        expiresAt: new Date(),
      });

      mockHttpService.axiosRef.post.mockResolvedValue({
        data: { id: 'google-class-123' },
      });

      mockPassRepository.create.mockReturnValue(mockPass);
      mockPassRepository.save.mockResolvedValue(mockPass);

      const result = await service.generatePass(passData);

      expect(result).toEqual({
        success: true,
        passId: 'pass-123',
        saveUrl: expect.stringContaining('https://pay.google.com/gp/v/save/'),
      });

      expect(mockPassRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passType: PassType.GOOGLE_PAY,
          status: PassStatus.ACTIVE,
        })
      );
      expect(mockPassRepository.save).toHaveBeenCalled();
      expect(mockAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should handle Google API errors', async () => {
      const passData = {
        userId: 'user-123',
        eventId: 'event-123',
        ticketId: 'ticket-123',
        templateId: 'template-123',
        passData: {},
      };

      mockConfigService.get.mockReturnValue('test-value');
      mockQRCodeService.generateQRCodeData.mockResolvedValue({
        data: 'qr-data-123',
        signature: 'qr-signature',
        expiresAt: new Date(),
      });

      mockHttpService.axiosRef.post.mockRejectedValue(new Error('Google API error'));

      await expect(service.generatePass(passData)).rejects.toThrow('Google API error');
    });
  });

  describe('updatePass', () => {
    it('should update an existing Google Pay pass successfully', async () => {
      const passId = 'pass-123';
      const updateData = {
        eventName: 'Updated Event Name',
        eventDate: new Date(),
      };

      const mockPass = {
        id: passId,
        passType: PassType.GOOGLE_PAY,
        status: PassStatus.ACTIVE,
        passData: { eventName: 'Original Event' },
        googlePayObjectId: 'google-object-123',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });
      mockHttpService.axiosRef.put.mockResolvedValue({
        data: { id: 'google-object-123' },
      });

      const result = await service.updatePass(passId, updateData, 'FIELD_UPDATE');

      expect(result).toEqual({
        success: true,
        passId,
        googlePayObjectId: 'google-object-123',
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
    it('should revoke a Google Pay pass successfully', async () => {
      const passId = 'pass-123';
      const reason = 'Event cancelled';

      const mockPass = {
        id: passId,
        status: PassStatus.ACTIVE,
        googlePayObjectId: 'google-object-123',
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);
      mockPassRepository.update.mockResolvedValue({ affected: 1 });
      mockHttpService.axiosRef.put.mockResolvedValue({
        data: { state: 'EXPIRED' },
      });

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

  describe('generateSaveUrl', () => {
    it('should generate save URL for Google Pay', async () => {
      const passId = 'pass-123';

      const mockPass = {
        id: passId,
        passType: PassType.GOOGLE_PAY,
        googlePayObjectId: 'google-object-123',
        status: PassStatus.ACTIVE,
      };

      mockPassRepository.findOne.mockResolvedValue(mockPass);

      const result = await service.generateSaveUrl(passId);

      expect(result).toEqual({
        success: true,
        saveUrl: expect.stringContaining('https://pay.google.com/gp/v/save/'),
      });

      expect(mockAnalyticsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPassId: passId,
          eventType: 'SAVE_URL_GENERATED',
        })
      );
    });

    it('should handle missing pass', async () => {
      const passId = 'non-existent';
      mockPassRepository.findOne.mockResolvedValue(null);

      const result = await service.generateSaveUrl(passId);

      expect(result).toEqual({
        success: false,
        error: 'Pass not found',
      });
    });
  });

  describe('createEventTicketClass', () => {
    it('should create event ticket class successfully', async () => {
      const classData = {
        id: 'class-123',
        eventName: 'Test Event',
        venueName: 'Test Venue',
        eventDate: new Date(),
      };

      mockHttpService.axiosRef.post.mockResolvedValue({
        data: { id: 'class-123' },
      });

      const result = await service.createEventTicketClass(classData);

      expect(result).toEqual({
        success: true,
        classId: 'class-123',
      });

      expect(mockHttpService.axiosRef.post).toHaveBeenCalledWith(
        expect.stringContaining('/eventticketclass'),
        expect.objectContaining({
          id: 'class-123',
        }),
        expect.any(Object)
      );
    });

    it('should handle class creation errors', async () => {
      const classData = {
        id: 'class-123',
        eventName: 'Test Event',
      };

      mockHttpService.axiosRef.post.mockRejectedValue(new Error('Class creation failed'));

      const result = await service.createEventTicketClass(classData);

      expect(result).toEqual({
        success: false,
        error: 'Class creation failed',
      });
    });
  });

  describe('createEventTicketObject', () => {
    it('should create event ticket object successfully', async () => {
      const objectData = {
        id: 'object-123',
        classId: 'class-123',
        ticketHolderName: 'John Doe',
        seatInfo: 'A1',
      };

      mockHttpService.axiosRef.post.mockResolvedValue({
        data: { id: 'object-123' },
      });

      const result = await service.createEventTicketObject(objectData);

      expect(result).toEqual({
        success: true,
        objectId: 'object-123',
      });

      expect(mockHttpService.axiosRef.post).toHaveBeenCalledWith(
        expect.stringContaining('/eventticketobject'),
        expect.objectContaining({
          id: 'object-123',
        }),
        expect.any(Object)
      );
    });

    it('should handle object creation errors', async () => {
      const objectData = {
        id: 'object-123',
        classId: 'class-123',
      };

      mockHttpService.axiosRef.post.mockRejectedValue(new Error('Object creation failed'));

      const result = await service.createEventTicketObject(objectData);

      expect(result).toEqual({
        success: false,
        error: 'Object creation failed',
      });
    });
  });

  describe('JWT token generation', () => {
    it('should generate valid JWT token', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          GOOGLE_PAY_SERVICE_ACCOUNT_EMAIL: 'service@example.com',
          GOOGLE_PAY_SERVICE_ACCOUNT_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNfFmuPiKuSRSKRIzrrL/3xYCsLNiPHuuKmOlz4HUIBmNZ5H2bRvewdpGjy
-----END PRIVATE KEY-----`,
        };
        return config[key];
      });

      // Test JWT generation indirectly through a method that uses it
      const passData = {
        userId: 'user-123',
        eventId: 'event-123',
        ticketId: 'ticket-123',
        templateId: 'template-123',
        passData: {
          eventName: 'Test Event',
        },
      };

      mockQRCodeService.generateQRCodeData.mockResolvedValue({
        data: 'qr-data-123',
        signature: 'qr-signature',
        expiresAt: new Date(),
      });

      mockHttpService.axiosRef.post.mockResolvedValue({
        data: { id: 'google-class-123' },
      });

      mockPassRepository.create.mockReturnValue({
        id: 'pass-123',
        passType: PassType.GOOGLE_PAY,
        status: PassStatus.ACTIVE,
        ...passData,
      });
      mockPassRepository.save.mockResolvedValue({
        id: 'pass-123',
        passType: PassType.GOOGLE_PAY,
        status: PassStatus.ACTIVE,
        ...passData,
      });

      const result = await service.generatePass(passData);

      expect(result.success).toBe(true);
      expect(mockHttpService.axiosRef.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Bearer .+/),
          }),
        })
      );
    });
  });
});
