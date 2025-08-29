import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionMonitoringService, TransactionData } from '../transaction-monitoring.service';
import { FraudCase } from '../../entities/fraud-case.entity';
import { RiskScore } from '../../entities/risk-score.entity';
import { BehavioralAnalysisService } from '../behavioral-analysis.service';
import { DeviceFingerprintingService } from '../device-fingerprinting.service';

describe('TransactionMonitoringService', () => {
  let service: TransactionMonitoringService;
  let fraudCaseRepository: Repository<FraudCase>;
  let riskScoreRepository: Repository<RiskScore>;
  let behavioralAnalysisService: BehavioralAnalysisService;
  let deviceFingerprintingService: DeviceFingerprintingService;

  const mockFraudCaseRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRiskScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBehavioralAnalysisService = {
    analyzeBehavior: jest.fn(),
  };

  const mockDeviceFingerprintingService = {
    generateFingerprint: jest.fn(),
    assessDeviceRisk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionMonitoringService,
        {
          provide: getRepositoryToken(FraudCase),
          useValue: mockFraudCaseRepository,
        },
        {
          provide: getRepositoryToken(RiskScore),
          useValue: mockRiskScoreRepository,
        },
        {
          provide: BehavioralAnalysisService,
          useValue: mockBehavioralAnalysisService,
        },
        {
          provide: DeviceFingerprintingService,
          useValue: mockDeviceFingerprintingService,
        },
      ],
    }).compile();

    service = module.get<TransactionMonitoringService>(TransactionMonitoringService);
    fraudCaseRepository = module.get<Repository<FraudCase>>(getRepositoryToken(FraudCase));
    riskScoreRepository = module.get<Repository<RiskScore>>(getRepositoryToken(RiskScore));
    behavioralAnalysisService = module.get<BehavioralAnalysisService>(BehavioralAnalysisService);
    deviceFingerprintingService = module.get<DeviceFingerprintingService>(DeviceFingerprintingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('monitorTransaction', () => {
    const mockTransactionData: TransactionData = {
      id: 'tx-123',
      userId: 'user-123',
      amount: 100,
      currency: 'USD',
      paymentMethod: 'credit_card',
      merchantId: 'merchant-123',
      timestamp: new Date(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        coordinates: [-122.4194, 37.7749],
      },
      deviceFingerprint: {
        hash: 'device-123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        language: 'en-US',
        languages: ['en-US', 'en'],
        platform: 'Win32',
        cookieEnabled: true,
        doNotTrack: '1',
        timezone: 'America/Los_Angeles',
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
        viewport: { width: 1200, height: 800 },
        plugins: [],
        fonts: ['Arial', 'Times New Roman'],
        canvas: 'canvas-hash',
        webgl: 'webgl-hash',
        audio: 'audio-hash',
      },
      sessionData: {
        duration: 300,
        pageViews: 5,
        clickPattern: [1, 2, 3],
        scrollBehavior: {},
        mouseMovements: {},
      },
    };

    it('should monitor low-risk transaction successfully', async () => {
      // Mock service responses for low-risk scenario
      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 20,
        anomalies: [],
        patterns: [],
        recommendations: [],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 25,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 25,
        riskLevel: 'low',
        riskFactors: [],
        recommendations: [],
        trustScore: 80,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(mockTransactionData);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx-123');
      expect(result.decision).toBe('approve');
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(40);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should monitor high-risk transaction and create fraud case', async () => {
      // Mock service responses for high-risk scenario
      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 85,
        anomalies: [
          {
            type: 'transaction_amount',
            severity: 'critical',
            confidence: 95,
            description: 'Transaction amount significantly above baseline',
            value: 5000,
            baseline: 100,
            deviation: 49,
          },
        ],
        patterns: [
          {
            pattern: 'high_value_velocity',
            frequency: 1,
            riskLevel: 'critical',
            description: 'Multiple high-value transactions in short timeframe',
          },
        ],
        recommendations: ['Block transaction and require manual review'],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-456',
        riskScore: 80,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-456',
        riskScore: 80,
        riskLevel: 'high',
        riskFactors: [
          {
            factor: 'new_device',
            severity: 'medium',
            description: 'Transaction from new device',
            weight: 25,
            detected: true,
            confidence: 90,
          },
        ],
        recommendations: ['Apply additional verification'],
        trustScore: 30,
      });

      const mockFraudCase = {
        id: 'fraud-case-123',
        userId: 'user-123',
        transactionId: 'tx-123',
        riskScore: 85,
      };

      mockFraudCaseRepository.create.mockReturnValue(mockFraudCase);
      mockFraudCaseRepository.save.mockResolvedValue(mockFraudCase);
      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const highRiskTransaction = {
        ...mockTransactionData,
        amount: 5000, // High amount
      };

      const result = await service.monitorTransaction(highRiskTransaction);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx-123');
      expect(result.decision).toMatch(/decline|review/);
      expect(result.riskLevel).toMatch(/high|critical/);
      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.fraudCaseId).toBe('fraud-case-123');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should handle velocity violations', async () => {
      // Mock high transaction velocity
      jest.spyOn(service as any, 'getTransactionCount').mockResolvedValue(15); // Above threshold
      jest.spyOn(service as any, 'getTransactionAmountSum').mockResolvedValue(8000);
      jest.spyOn(service as any, 'getUniquePaymentMethods').mockResolvedValue(2);

      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 30,
        anomalies: [],
        patterns: [],
        recommendations: [],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 25,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 25,
        riskLevel: 'low',
        riskFactors: [],
        recommendations: [],
        trustScore: 80,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(mockTransactionData);

      expect(result.reasons).toContain(
        expect.stringMatching(/velocity.*exceeded/i)
      );
      expect(result.decision).toMatch(/review|decline|challenge/);
    });

    it('should handle off-hours transactions', async () => {
      const offHoursTransaction = {
        ...mockTransactionData,
        timestamp: new Date('2023-01-01T03:00:00Z'), // 3 AM
      };

      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 35,
        anomalies: [],
        patterns: [],
        recommendations: [],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 25,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 25,
        riskLevel: 'low',
        riskFactors: [],
        recommendations: [],
        trustScore: 80,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(offHoursTransaction);

      expect(result.reasons).toContain(
        expect.stringMatching(/unusual hours/i)
      );
    });

    it('should handle high-value transactions', async () => {
      const highValueTransaction = {
        ...mockTransactionData,
        amount: 8000, // High amount
      };

      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 40,
        anomalies: [],
        patterns: [],
        recommendations: [],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 25,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 25,
        riskLevel: 'low',
        riskFactors: [],
        recommendations: [],
        trustScore: 80,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(highValueTransaction);

      expect(result.reasons).toContain(
        expect.stringMatching(/high.*amount|amount.*threshold/i)
      );
    });

    it('should handle service failures gracefully', async () => {
      mockBehavioralAnalysisService.analyzeBehavior.mockRejectedValue(
        new Error('Behavioral analysis service unavailable')
      );

      mockDeviceFingerprintingService.generateFingerprint.mockRejectedValue(
        new Error('Device fingerprinting service unavailable')
      );

      const result = await service.monitorTransaction(mockTransactionData);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx-123');
      expect(result.decision).toBe('review');
      expect(result.reasons).toContain('System error during fraud check');
      expect(result.riskScore).toBe(50); // Default fallback score
    });

    it('should calculate processing time', async () => {
      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 30,
        anomalies: [],
        patterns: [],
        recommendations: [],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 25,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 25,
        riskLevel: 'low',
        riskFactors: [],
        recommendations: [],
        trustScore: 80,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(mockTransactionData);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });

    it('should provide appropriate recommendations based on risk level', async () => {
      mockBehavioralAnalysisService.analyzeBehavior.mockResolvedValue({
        riskScore: 75,
        anomalies: [
          {
            type: 'location_pattern',
            severity: 'high',
            confidence: 85,
            description: 'Transaction from unusual location',
          },
        ],
        patterns: [],
        recommendations: ['Verify location through additional means'],
      });

      mockDeviceFingerprintingService.generateFingerprint.mockResolvedValue({
        id: 'device-123',
        riskScore: 70,
      });

      mockDeviceFingerprintingService.assessDeviceRisk.mockResolvedValue({
        deviceId: 'device-123',
        riskScore: 70,
        riskLevel: 'high',
        riskFactors: [
          {
            factor: 'location_pattern',
            severity: 'high',
            description: 'Transaction from new location',
            weight: 30,
            detected: true,
            confidence: 85,
          },
        ],
        recommendations: ['Verify location through additional means'],
        trustScore: 40,
      });

      mockRiskScoreRepository.create.mockReturnValue({});
      mockRiskScoreRepository.save.mockResolvedValue({});

      const result = await service.monitorTransaction(mockTransactionData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain(
        expect.stringMatching(/review|verification|authentication/i)
      );
    });
  });
});
