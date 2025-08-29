import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ReferralProgramService } from '../referral-program.service';
import { ReferralProgram, ProgramStatus } from '../../entities/referral-program.entity';
import { ReferralCode, CodeStatus } from '../../entities/referral-code.entity';
import { ReferralTracking, TrackingStatus, ConversionType } from '../../entities/referral-tracking.entity';

describe('ReferralProgramService', () => {
  let service: ReferralProgramService;
  let programRepository: Repository<ReferralProgram>;
  let codeRepository: Repository<ReferralCode>;
  let trackingRepository: Repository<ReferralTracking>;

  const mockProgram = {
    id: 'program-1',
    organizerId: 'organizer-1',
    name: 'Test Referral Program',
    rewardType: 'percentage',
    rewardValue: 10,
    status: ProgramStatus.ACTIVE,
    analytics: {
      totalCodes: 0,
      activeCodes: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      conversionRate: 0,
      averageOrderValue: 0,
    },
  };

  const mockCode = {
    id: 'code-1',
    programId: 'program-1',
    userId: 'user-1',
    code: 'REF12345',
    status: CodeStatus.ACTIVE,
    usedCount: 0,
    analytics: {
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      revenue: 0,
      conversionRate: 0,
    },
  };

  const mockTracking = {
    id: 'tracking-1',
    codeId: 'code-1',
    programId: 'program-1',
    status: TrackingStatus.CLICKED,
    deviceInfo: { ipAddress: '127.0.0.1' },
    fraudDetection: { riskScore: 10, flags: [], isBlocked: false },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralProgramService,
        {
          provide: getRepositoryToken(ReferralProgram),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReferralCode),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReferralTracking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('REF'),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralProgramService>(ReferralProgramService);
    programRepository = module.get<Repository<ReferralProgram>>(getRepositoryToken(ReferralProgram));
    codeRepository = module.get<Repository<ReferralCode>>(getRepositoryToken(ReferralCode));
    trackingRepository = module.get<Repository<ReferralTracking>>(getRepositoryToken(ReferralTracking));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProgram', () => {
    it('should create a new referral program', async () => {
      const createDto = {
        organizerId: 'organizer-1',
        name: 'Test Referral Program',
        rewardType: 'percentage',
        rewardValue: 10,
      };

      jest.spyOn(programRepository, 'create').mockReturnValue(mockProgram as any);
      jest.spyOn(programRepository, 'save').mockResolvedValue(mockProgram as any);

      const result = await service.createProgram(createDto);

      expect(programRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: ProgramStatus.DRAFT,
        analytics: expect.any(Object),
      });
      expect(result).toEqual(mockProgram);
    });
  });

  describe('generateReferralCode', () => {
    it('should generate a new referral code', async () => {
      const codeDto = {
        programId: 'program-1',
        userId: 'user-1',
      };

      jest.spyOn(service, 'findProgramById').mockResolvedValue(mockProgram as any);
      jest.spyOn(codeRepository, 'findOne').mockResolvedValue(null); // No existing code
      jest.spyOn(codeRepository, 'create').mockReturnValue(mockCode as any);
      jest.spyOn(codeRepository, 'save').mockResolvedValue(mockCode as any);
      jest.spyOn(service, 'updateProgramAnalytics').mockResolvedValue(undefined);

      const result = await service.generateReferralCode(codeDto);

      expect(codeRepository.create).toHaveBeenCalledWith({
        ...codeDto,
        code: expect.any(String),
        status: CodeStatus.ACTIVE,
        analytics: expect.any(Object),
        socialSharing: expect.any(Object),
      });
      expect(result).toEqual(mockCode);
    });

    it('should return existing active code for user', async () => {
      const codeDto = {
        programId: 'program-1',
        userId: 'user-1',
      };

      jest.spyOn(service, 'findProgramById').mockResolvedValue(mockProgram as any);
      jest.spyOn(codeRepository, 'findOne').mockResolvedValue(mockCode as any);

      const result = await service.generateReferralCode(codeDto);

      expect(result).toEqual(mockCode);
      expect(codeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('trackReferralClick', () => {
    it('should track a referral click', async () => {
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://google.com',
      };

      jest.spyOn(service, 'findCodeByCode').mockResolvedValue(mockCode as any);
      jest.spyOn(trackingRepository, 'create').mockReturnValue(mockTracking as any);
      jest.spyOn(trackingRepository, 'save').mockResolvedValue(mockTracking as any);
      jest.spyOn(service, 'updateCodeAnalytics').mockResolvedValue(undefined);

      const result = await service.trackReferralClick('REF12345', metadata);

      expect(trackingRepository.create).toHaveBeenCalledWith({
        codeId: mockCode.id,
        programId: mockCode.programId,
        status: TrackingStatus.CLICKED,
        deviceInfo: expect.any(Object),
        sourceInfo: expect.any(Object),
        fraudDetection: expect.any(Object),
      });
      expect(result).toEqual(mockTracking);
    });

    it('should reject expired codes', async () => {
      const expiredCode = {
        ...mockCode,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      jest.spyOn(service, 'findCodeByCode').mockResolvedValue(expiredCode as any);

      await expect(service.trackReferralClick('REF12345', {}))
        .rejects.toThrow('Referral code has expired');
    });
  });

  describe('processReferralConversion', () => {
    it('should process a referral conversion', async () => {
      const conversionDto = {
        codeId: 'code-1',
        convertedUserId: 'user-2',
        conversionType: ConversionType.PURCHASE,
        conversionValue: 100,
      };

      const codeWithProgram = { ...mockCode, program: mockProgram };
      const convertedTracking = {
        ...mockTracking,
        status: TrackingStatus.CONVERTED,
        convertedUserId: 'user-2',
        conversionValue: 100,
      };

      jest.spyOn(codeRepository, 'findOne').mockResolvedValue(codeWithProgram as any);
      jest.spyOn(trackingRepository, 'findOne').mockResolvedValue(mockTracking as any);
      jest.spyOn(trackingRepository, 'save').mockResolvedValue(convertedTracking as any);
      jest.spyOn(service, 'updateCodeAnalytics').mockResolvedValue(undefined);
      jest.spyOn(service, 'updateProgramAnalytics').mockResolvedValue(undefined);
      jest.spyOn(service, 'processRewards').mockResolvedValue(undefined);

      const result = await service.processReferralConversion(conversionDto);

      expect(result.status).toBe(TrackingStatus.CONVERTED);
      expect(result.convertedUserId).toBe('user-2');
      expect(result.conversionValue).toBe(100);
    });
  });

  describe('getReferralAnalytics', () => {
    it('should return analytics for a referral code', async () => {
      const trackingRecords = [
        { ...mockTracking, status: TrackingStatus.CLICKED },
        { ...mockTracking, status: TrackingStatus.CONVERTED, conversionValue: 50 },
      ];

      jest.spyOn(codeRepository, 'findOne').mockResolvedValue(mockCode as any);
      jest.spyOn(trackingRepository, 'find').mockResolvedValue(trackingRecords as any);

      const result = await service.getReferralAnalytics('code-1');

      expect(result.totalClicks).toBe(1);
      expect(result.totalConversions).toBe(1);
      expect(result.conversionRate).toBe(100);
      expect(result.totalRevenue).toBe(50);
    });
  });

  describe('updateProgramStatus', () => {
    it('should update program status to active', async () => {
      const updatedProgram = { ...mockProgram, status: ProgramStatus.ACTIVE, startDate: new Date() };

      jest.spyOn(service, 'findProgramById').mockResolvedValue(mockProgram as any);
      jest.spyOn(programRepository, 'save').mockResolvedValue(updatedProgram as any);

      const result = await service.updateProgramStatus('program-1', ProgramStatus.ACTIVE);

      expect(result.status).toBe(ProgramStatus.ACTIVE);
      expect(result.startDate).toBeDefined();
    });
  });
});
