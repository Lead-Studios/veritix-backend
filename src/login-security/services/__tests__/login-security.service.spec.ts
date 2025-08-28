import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginSecurityService } from '../login-security.service';
import { LoginAttempt, LoginStatus, LoginMethod } from '../../entities/login-attempt.entity';
import { TrustedDevice } from '../../entities/trusted-device.entity';
import { GeoIpService } from '../geo-ip.service';
import { DeviceFingerprintService } from '../device-fingerprint.service';
import { SecurityNotificationService } from '../security-notification.service';

describe('LoginSecurityService', () => {
  let service: LoginSecurityService;
  let loginAttemptRepository: Repository<LoginAttempt>;
  let trustedDeviceRepository: Repository<TrustedDevice>;
  let geoIpService: GeoIpService;
  let deviceFingerprintService: DeviceFingerprintService;
  let securityNotificationService: SecurityNotificationService;

  const mockLoginAttemptRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockTrustedDeviceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockGeoIpService = {
    getLocationByIp: jest.fn(),
    isNewLocation: jest.fn(),
  };

  const mockDeviceFingerprintService = {
    parseUserAgent: jest.fn(),
    isNewDevice: jest.fn(),
  };

  const mockSecurityNotificationService = {
    sendNewLocationNotification: jest.fn(),
    sendNewDeviceNotification: jest.fn(),
    sendSuspiciousLoginNotification: jest.fn(),
  };

  const mockLoginContext = {
    userId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    method: LoginMethod.EMAIL_PASSWORD,
    ownerId: 'owner-1',
  };

  const mockLocation = {
    country: 'United States',
    region: 'California',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    isp: 'Comcast',
  };

  const mockDeviceInfo = {
    fingerprint: 'device-fingerprint-123',
    deviceType: 'desktop',
    browser: 'Chrome',
    operatingSystem: 'Windows 10',
    deviceName: 'desktop - Chrome on Windows 10',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginSecurityService,
        {
          provide: getRepositoryToken(LoginAttempt),
          useValue: mockLoginAttemptRepository,
        },
        {
          provide: getRepositoryToken(TrustedDevice),
          useValue: mockTrustedDeviceRepository,
        },
        {
          provide: GeoIpService,
          useValue: mockGeoIpService,
        },
        {
          provide: DeviceFingerprintService,
          useValue: mockDeviceFingerprintService,
        },
        {
          provide: SecurityNotificationService,
          useValue: mockSecurityNotificationService,
        },
      ],
    }).compile();

    service = module.get<LoginSecurityService>(LoginSecurityService);
    loginAttemptRepository = module.get<Repository<LoginAttempt>>(getRepositoryToken(LoginAttempt));
    trustedDeviceRepository = module.get<Repository<TrustedDevice>>(getRepositoryToken(TrustedDevice));
    geoIpService = module.get<GeoIpService>(GeoIpService);
    deviceFingerprintService = module.get<DeviceFingerprintService>(DeviceFingerprintService);
    securityNotificationService = module.get<SecurityNotificationService>(SecurityNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordLoginAttempt', () => {
    it('should record successful login attempt', async () => {
      const mockLoginAttempt = {
        id: 'attempt-1',
        ...mockLoginContext,
        status: LoginStatus.SUCCESS,
        isNewLocation: false,
        isNewDevice: false,
        isSuspicious: false,
      };

      mockGeoIpService.getLocationByIp.mockResolvedValue(mockLocation);
      mockDeviceFingerprintService.parseUserAgent.mockReturnValue(mockDeviceInfo);
      mockLoginAttemptRepository.find.mockResolvedValue([]);
      mockTrustedDeviceRepository.findOne.mockResolvedValue({ id: 'device-1' });
      mockLoginAttemptRepository.create.mockReturnValue(mockLoginAttempt);
      mockLoginAttemptRepository.save.mockResolvedValue(mockLoginAttempt);
      mockLoginAttemptRepository.count.mockResolvedValue(0);

      const result = await service.recordLoginAttempt(mockLoginContext, LoginStatus.SUCCESS);

      expect(mockGeoIpService.getLocationByIp).toHaveBeenCalledWith(mockLoginContext.ipAddress);
      expect(mockDeviceFingerprintService.parseUserAgent).toHaveBeenCalledWith(mockLoginContext.userAgent);
      expect(mockLoginAttemptRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockLoginAttempt);
    });

    it('should detect new location and send notification', async () => {
      const mockLoginAttempt = {
        id: 'attempt-1',
        ...mockLoginContext,
        status: LoginStatus.SUCCESS,
        isNewLocation: true,
        isNewDevice: false,
        isSuspicious: false,
      };

      mockGeoIpService.getLocationByIp.mockResolvedValue(mockLocation);
      mockDeviceFingerprintService.parseUserAgent.mockReturnValue(mockDeviceInfo);
      mockLoginAttemptRepository.find.mockResolvedValue([]);
      mockTrustedDeviceRepository.findOne.mockResolvedValue({ id: 'device-1' });
      mockLoginAttemptRepository.create.mockReturnValue(mockLoginAttempt);
      mockLoginAttemptRepository.save.mockResolvedValue(mockLoginAttempt);
      mockLoginAttemptRepository.count.mockResolvedValue(0);
      mockGeoIpService.isNewLocation.mockReturnValue(true);

      const result = await service.recordLoginAttempt(mockLoginContext, LoginStatus.SUCCESS);

      expect(mockSecurityNotificationService.sendNewLocationNotification).toHaveBeenCalledWith(mockLoginAttempt);
      expect(result.isNewLocation).toBe(true);
    });

    it('should detect new device and send notification', async () => {
      const mockLoginAttempt = {
        id: 'attempt-1',
        ...mockLoginContext,
        status: LoginStatus.SUCCESS,
        isNewLocation: false,
        isNewDevice: true,
        isSuspicious: false,
      };

      mockGeoIpService.getLocationByIp.mockResolvedValue(mockLocation);
      mockDeviceFingerprintService.parseUserAgent.mockReturnValue(mockDeviceInfo);
      mockLoginAttemptRepository.find.mockResolvedValue([]);
      mockTrustedDeviceRepository.findOne.mockResolvedValue(null);
      mockLoginAttemptRepository.create.mockReturnValue(mockLoginAttempt);
      mockLoginAttemptRepository.save.mockResolvedValue(mockLoginAttempt);
      mockLoginAttemptRepository.count.mockResolvedValue(0);
      mockTrustedDeviceRepository.create.mockReturnValue({ id: 'new-device' });
      mockTrustedDeviceRepository.save.mockResolvedValue({ id: 'new-device' });

      const result = await service.recordLoginAttempt(mockLoginContext, LoginStatus.SUCCESS);

      expect(mockSecurityNotificationService.sendNewDeviceNotification).toHaveBeenCalledWith(mockLoginAttempt);
      expect(mockTrustedDeviceRepository.save).toHaveBeenCalled();
      expect(result.isNewDevice).toBe(true);
    });

    it('should detect suspicious login', async () => {
      const mockLoginAttempt = {
        id: 'attempt-1',
        ...mockLoginContext,
        status: LoginStatus.SUCCESS,
        isNewLocation: true,
        isNewDevice: true,
        isSuspicious: true,
      };

      mockGeoIpService.getLocationByIp.mockResolvedValue(mockLocation);
      mockDeviceFingerprintService.parseUserAgent.mockReturnValue(mockDeviceInfo);
      mockLoginAttemptRepository.find.mockResolvedValue([]);
      mockTrustedDeviceRepository.findOne.mockResolvedValue(null);
      mockLoginAttemptRepository.create.mockReturnValue(mockLoginAttempt);
      mockLoginAttemptRepository.save.mockResolvedValue(mockLoginAttempt);
      mockLoginAttemptRepository.count.mockResolvedValue(0);
      mockGeoIpService.isNewLocation.mockReturnValue(true);

      const result = await service.recordLoginAttempt(mockLoginContext, LoginStatus.SUCCESS);

      expect(mockSecurityNotificationService.sendSuspiciousLoginNotification).toHaveBeenCalledWith(mockLoginAttempt);
      expect(result.isSuspicious).toBe(true);
    });

    it('should handle failed login attempt', async () => {
      const mockLoginAttempt = {
        id: 'attempt-1',
        ...mockLoginContext,
        status: LoginStatus.FAILED,
        failureReason: 'Invalid password',
        isSuspicious: true,
      };

      mockGeoIpService.getLocationByIp.mockResolvedValue(mockLocation);
      mockDeviceFingerprintService.parseUserAgent.mockReturnValue(mockDeviceInfo);
      mockLoginAttemptRepository.create.mockReturnValue(mockLoginAttempt);
      mockLoginAttemptRepository.save.mockResolvedValue(mockLoginAttempt);

      const result = await service.recordLoginAttempt(mockLoginContext, LoginStatus.FAILED, 'Invalid password');

      expect(result.status).toBe(LoginStatus.FAILED);
      expect(result.failureReason).toBe('Invalid password');
      expect(result.isSuspicious).toBe(true);
    });
  });

  describe('getLoginHistory', () => {
    it('should return login history for user', async () => {
      const mockHistory = [
        { id: 'attempt-1', userId: 'user-1', status: LoginStatus.SUCCESS },
        { id: 'attempt-2', userId: 'user-1', status: LoginStatus.FAILED },
      ];

      mockLoginAttemptRepository.find.mockResolvedValue(mockHistory);

      const result = await service.getLoginHistory('user-1', 50, 'owner-1');

      expect(mockLoginAttemptRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', ownerId: 'owner-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getTrustedDevices', () => {
    it('should return trusted devices for user', async () => {
      const mockDevices = [
        { id: 'device-1', userId: 'user-1', deviceName: 'iPhone' },
        { id: 'device-2', userId: 'user-1', deviceName: 'MacBook' },
      ];

      mockTrustedDeviceRepository.find.mockResolvedValue(mockDevices);

      const result = await service.getTrustedDevices('user-1', 'owner-1');

      expect(mockTrustedDeviceRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true, ownerId: 'owner-1' },
        order: { lastUsedAt: 'DESC' },
      });
      expect(result).toEqual(mockDevices);
    });
  });

  describe('revokeTrustedDevice', () => {
    it('should revoke a trusted device', async () => {
      mockTrustedDeviceRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeTrustedDevice('device-1', 'user-1', 'owner-1');

      expect(mockTrustedDeviceRepository.update).toHaveBeenCalledWith(
        { id: 'device-1', userId: 'user-1', ownerId: 'owner-1' },
        { isActive: false }
      );
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', async () => {
      const mockAttempts = [
        { status: LoginStatus.SUCCESS, isNewLocation: true, isNewDevice: false, country: 'US' },
        { status: LoginStatus.FAILED, isNewLocation: false, isNewDevice: true, country: 'CA' },
        { status: LoginStatus.SUCCESS, isNewLocation: false, isNewDevice: false, country: 'US' },
      ];

      mockLoginAttemptRepository.find.mockResolvedValue(mockAttempts);

      const result = await service.getSecurityStats('user-1', 30, 'owner-1');

      expect(result).toEqual({
        totalAttempts: 3,
        successfulLogins: 2,
        failedAttempts: 1,
        newLocations: 1,
        newDevices: 1,
        suspiciousAttempts: 0,
        uniqueCountries: 2,
        uniqueDevices: 0,
      });
    });
  });
});
