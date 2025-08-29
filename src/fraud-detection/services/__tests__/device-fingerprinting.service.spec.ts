import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceFingerprintingService, DeviceFingerprintData } from '../device-fingerprinting.service';
import { DeviceFingerprint, DeviceStatus, DeviceRiskLevel } from '../../entities/device-fingerprint.entity';
import { RiskScore } from '../../entities/risk-score.entity';

describe('DeviceFingerprintingService', () => {
  let service: DeviceFingerprintingService;
  let deviceFingerprintRepository: Repository<DeviceFingerprint>;
  let riskScoreRepository: Repository<RiskScore>;

  const mockDeviceFingerprintRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRiskScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceFingerprintingService,
        {
          provide: getRepositoryToken(DeviceFingerprint),
          useValue: mockDeviceFingerprintRepository,
        },
        {
          provide: getRepositoryToken(RiskScore),
          useValue: mockRiskScoreRepository,
        },
      ],
    }).compile();

    service = module.get<DeviceFingerprintingService>(DeviceFingerprintingService);
    deviceFingerprintRepository = module.get<Repository<DeviceFingerprint>>(
      getRepositoryToken(DeviceFingerprint),
    );
    riskScoreRepository = module.get<Repository<RiskScore>>(getRepositoryToken(RiskScore));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFingerprint', () => {
    const mockDeviceFingerprintData: DeviceFingerprintData = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'Win32',
      cookieEnabled: true,
      doNotTrack: '1',
      timezone: 'America/Los_Angeles',
      screen: {
        width: 1920,
        height: 1080,
        colorDepth: 24,
        pixelRatio: 1,
      },
      viewport: {
        width: 1200,
        height: 800,
      },
      plugins: [
        { name: 'Chrome PDF Plugin', version: '1.0' },
        { name: 'Chromium PDF Plugin', version: '1.0' },
      ],
      fonts: ['Arial', 'Times New Roman', 'Helvetica'],
      canvas: 'canvas-fingerprint-hash',
      webgl: 'webgl-fingerprint-hash',
      audio: 'audio-fingerprint-hash',
      ipAddress: '192.168.1.100',
      userId: 'user-123',
    };

    it('should create new device fingerprint', async () => {
      mockDeviceFingerprintRepository.findOne.mockResolvedValue(null);
      
      const mockNewDevice = {
        id: 'device-123',
        fingerprintHash: 'generated-hash',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        status: DeviceStatus.UNKNOWN,
        riskScore: 50,
        riskLevel: DeviceRiskLevel.MEDIUM,
      };

      mockDeviceFingerprintRepository.create.mockReturnValue(mockNewDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(mockNewDevice);

      const result = await service.generateFingerprint(mockDeviceFingerprintData);

      expect(result).toBeDefined();
      expect(result.id).toBe('device-123');
      expect(result.userId).toBe('user-123');
      expect(result.ipAddress).toBe('192.168.1.100');
      expect(mockDeviceFingerprintRepository.create).toHaveBeenCalled();
      expect(mockDeviceFingerprintRepository.save).toHaveBeenCalled();
    });

    it('should update existing device fingerprint', async () => {
      const mockExistingDevice = {
        id: 'device-123',
        fingerprintHash: 'existing-hash',
        userId: 'user-123',
        ipAddress: '192.168.1.50',
        seenCount: 5,
        lastSeenAt: new Date('2023-01-01'),
        associatedUsers: [
          {
            userId: 'user-123',
            firstSeen: new Date('2023-01-01'),
            lastSeen: new Date('2023-01-01'),
            sessionCount: 5,
            trustLevel: 70,
          },
        ],
        locationHistory: [],
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(mockExistingDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue({
        ...mockExistingDevice,
        seenCount: 6,
        ipAddress: '192.168.1.100',
      });

      const result = await service.generateFingerprint(mockDeviceFingerprintData);

      expect(result).toBeDefined();
      expect(result.seenCount).toBe(6);
      expect(result.ipAddress).toBe('192.168.1.100');
      expect(mockDeviceFingerprintRepository.save).toHaveBeenCalled();
    });

    it('should handle new user on existing device', async () => {
      const mockExistingDevice = {
        id: 'device-123',
        fingerprintHash: 'existing-hash',
        userId: 'user-456',
        ipAddress: '192.168.1.100',
        seenCount: 3,
        associatedUsers: [
          {
            userId: 'user-456',
            firstSeen: new Date('2023-01-01'),
            lastSeen: new Date('2023-01-01'),
            sessionCount: 3,
            trustLevel: 60,
          },
        ],
        locationHistory: [],
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(mockExistingDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue({
        ...mockExistingDevice,
        associatedUsers: [
          ...mockExistingDevice.associatedUsers,
          {
            userId: 'user-123',
            firstSeen: new Date(),
            lastSeen: new Date(),
            sessionCount: 1,
            trustLevel: 50,
          },
        ],
      });

      const result = await service.generateFingerprint(mockDeviceFingerprintData);

      expect(result.associatedUsers).toHaveLength(2);
      expect(result.associatedUsers.some(u => u.userId === 'user-123')).toBe(true);
    });
  });

  describe('assessDeviceRisk', () => {
    const mockDevice = {
      id: 'device-123',
      fingerprintHash: 'hash-123',
      userId: 'user-123',
      ipAddress: '192.168.1.100',
      status: DeviceStatus.UNKNOWN,
      riskScore: 50,
      riskLevel: DeviceRiskLevel.MEDIUM,
      networkInfo: {
        isProxy: false,
        isVpn: false,
        isTor: false,
        isHosting: false,
      },
      associatedUsers: [
        {
          userId: 'user-123',
          sessionCount: 5,
        },
      ],
      locationHistory: [
        {
          country: 'US',
          region: 'CA',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
        },
      ],
      fraudulentSessions: 0,
      legitimateSessions: 5,
      firstSeenAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      lastSeenAt: new Date(),
      daysSinceFirstSeen: 10,
      isNewDevice: false,
      riskFactors: [],
    };

    it('should assess low-risk device', async () => {
      mockDeviceFingerprintRepository.findOne.mockResolvedValue(mockDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(mockDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result).toBeDefined();
      expect(result.deviceId).toBe('device-123');
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(60);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should detect proxy/VPN usage', async () => {
      const proxyDevice = {
        ...mockDevice,
        networkInfo: {
          ...mockDevice.networkInfo,
          isProxy: true,
          isVpn: true,
        },
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(proxyDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(proxyDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.riskFactors.some(rf => rf.factor === 'proxy_vpn_usage')).toBe(true);
      expect(result.riskLevel).toMatch(/high|critical/);
      expect(result.recommendations).toContain(
        expect.stringMatching(/proxy|vpn|verification/i)
      );
    });

    it('should detect Tor usage', async () => {
      const torDevice = {
        ...mockDevice,
        networkInfo: {
          ...mockDevice.networkInfo,
          isTor: true,
        },
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(torDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(torDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.riskFactors.some(rf => rf.factor === 'tor_usage')).toBe(true);
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendations).toContain(
        expect.stringMatching(/tor|block|verification/i)
      );
    });

    it('should detect multiple user associations', async () => {
      const multiUserDevice = {
        ...mockDevice,
        associatedUsers: [
          { userId: 'user-1', sessionCount: 5 },
          { userId: 'user-2', sessionCount: 3 },
          { userId: 'user-3', sessionCount: 2 },
          { userId: 'user-4', sessionCount: 1 },
        ],
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(multiUserDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(multiUserDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.riskFactors.some(rf => rf.factor === 'multiple_users')).toBe(true);
      expect(result.riskLevel).toMatch(/medium|high/);
      expect(result.recommendations).toContain(
        expect.stringMatching(/shared.*device|investigate/i)
      );
    });

    it('should detect fraud history', async () => {
      const fraudDevice = {
        ...mockDevice,
        fraudulentSessions: 3,
        legitimateSessions: 2,
        get fraudRate() {
          return (this.fraudulentSessions / (this.fraudulentSessions + this.legitimateSessions)) * 100;
        },
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(fraudDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(fraudDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.riskFactors.some(rf => rf.factor === 'fraud_history')).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    it('should detect new device', async () => {
      const newDevice = {
        ...mockDevice,
        firstSeenAt: new Date(),
        daysSinceFirstSeen: 0,
        isNewDevice: true,
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(newDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(newDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.riskFactors.some(rf => rf.factor === 'new_device')).toBe(true);
      expect(result.riskFactors.find(rf => rf.factor === 'new_device')?.severity).toBe('low');
    });

    it('should handle device not found', async () => {
      mockDeviceFingerprintRepository.findOne.mockResolvedValue(null);

      await expect(service.assessDeviceRisk('nonexistent-device')).rejects.toThrow(
        'Device not found: nonexistent-device'
      );
    });

    it('should update device status based on risk level', async () => {
      const criticalRiskDevice = {
        ...mockDevice,
        networkInfo: {
          ...mockDevice.networkInfo,
          isTor: true,
        },
        fraudulentSessions: 5,
        legitimateSessions: 0,
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(criticalRiskDevice);
      mockDeviceFingerprintRepository.save.mockImplementation((device) => {
        expect(device.status).toBe(DeviceStatus.BLOCKED);
        return Promise.resolve(device);
      });
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      await service.assessDeviceRisk('device-123');

      expect(mockDeviceFingerprintRepository.save).toHaveBeenCalled();
    });

    it('should create risk score record', async () => {
      mockDeviceFingerprintRepository.findOne.mockResolvedValue(mockDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(mockDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      await service.assessDeviceRisk('device-123');

      expect(mockRiskScoreRepository.create).toHaveBeenCalled();
      expect(mockRiskScoreRepository.save).toHaveBeenCalled();
    });

    it('should calculate trust score correctly', async () => {
      const trustedDevice = {
        ...mockDevice,
        daysSinceFirstSeen: 60, // Old device
        seenCount: 50, // Frequently used
        fraudulentSessions: 0,
        legitimateSessions: 50,
        riskFactors: [],
      };

      mockDeviceFingerprintRepository.findOne.mockResolvedValue(trustedDevice);
      mockDeviceFingerprintRepository.save.mockResolvedValue(trustedDevice);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.assessDeviceRisk('device-123');

      expect(result.trustScore).toBeGreaterThan(70);
    });
  });
});
