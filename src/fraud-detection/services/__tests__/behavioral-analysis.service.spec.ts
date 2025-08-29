import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralAnalysisService, UserBehaviorData } from '../behavioral-analysis.service';
import { BehavioralPattern } from '../../entities/behavioral-pattern.entity';
import { FraudCase } from '../../entities/fraud-case.entity';

describe('BehavioralAnalysisService', () => {
  let service: BehavioralAnalysisService;
  let behavioralPatternRepository: Repository<BehavioralPattern>;
  let fraudCaseRepository: Repository<FraudCase>;

  const mockBehavioralPatternRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFraudCaseRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehavioralAnalysisService,
        {
          provide: getRepositoryToken(BehavioralPattern),
          useValue: mockBehavioralPatternRepository,
        },
        {
          provide: getRepositoryToken(FraudCase),
          useValue: mockFraudCaseRepository,
        },
      ],
    }).compile();

    service = module.get<BehavioralAnalysisService>(BehavioralAnalysisService);
    behavioralPatternRepository = module.get<Repository<BehavioralPattern>>(
      getRepositoryToken(BehavioralPattern),
    );
    fraudCaseRepository = module.get<Repository<FraudCase>>(
      getRepositoryToken(FraudCase),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeBehavior', () => {
    const mockBehaviorData: UserBehaviorData = {
      userId: 'user-123',
      sessionData: {
        duration: 300,
        pageViews: 5,
        clickPattern: [1, 2, 3],
        scrollBehavior: {},
        mouseMovements: {},
      },
      transactionData: {
        amount: 100,
        frequency: 1,
        timeOfDay: 14,
        dayOfWeek: 2,
        paymentMethod: 'credit_card',
        location: {
          country: 'US',
          city: 'San Francisco',
          coordinates: [-122.4194, 37.7749],
        },
      },
      deviceData: {
        fingerprint: 'device-123',
        type: 'desktop',
        newDevice: false,
      },
    };

    it('should analyze behavior for new user', async () => {
      mockBehavioralPatternRepository.findOne.mockResolvedValue(null);
      mockBehavioralPatternRepository.create.mockReturnValue({
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 0, std: 0, min: 0, max: 0 },
          transactionAmount: { mean: 0, std: 0, min: 0, max: 0 },
          transactionFrequency: { mean: 0, std: 0, min: 0, max: 0 },
          timeOfDayPreference: {},
          dayOfWeekPreference: {},
          locationPatterns: [],
          devicePatterns: [],
          paymentMethodPreference: {},
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'medium',
        confidenceScore: 0,
        sampleSize: 0,
        isActive: true,
      });
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(mockBehaviorData);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.anomalies).toBeInstanceOf(Array);
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should analyze behavior for existing user with baseline', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 250, std: 50, min: 100, max: 400 },
          transactionAmount: { mean: 150, std: 75, min: 50, max: 300 },
          transactionFrequency: { mean: 2, std: 1, min: 1, max: 5 },
          timeOfDayPreference: { 14: 5, 15: 3, 16: 2 },
          dayOfWeekPreference: { 1: 2, 2: 5, 3: 3 },
          locationPatterns: [
            { country: 'US', city: 'San Francisco', coordinates: [-122.4194, 37.7749], frequency: 8 },
          ],
          devicePatterns: [{ fingerprint: 'device-123', type: 'desktop', frequency: 10 }],
          paymentMethodPreference: { credit_card: 8, debit_card: 2 },
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 85,
        sampleSize: 10,
        isActive: true,
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(mockBehaviorData);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should detect session duration anomaly', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 100, std: 20, min: 50, max: 150 },
          transactionAmount: { mean: 100, std: 25, min: 50, max: 200 },
          transactionFrequency: { mean: 1, std: 0.5, min: 1, max: 3 },
          timeOfDayPreference: { 14: 5 },
          dayOfWeekPreference: { 2: 5 },
          locationPatterns: [
            { country: 'US', city: 'San Francisco', coordinates: [-122.4194, 37.7749], frequency: 5 },
          ],
          devicePatterns: [],
          paymentMethodPreference: { credit_card: 5 },
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 80,
        sampleSize: 5,
        isActive: true,
      };

      // Create behavior data with anomalous session duration
      const anomalousBehaviorData = {
        ...mockBehaviorData,
        sessionData: {
          ...mockBehaviorData.sessionData,
          duration: 500, // Much higher than baseline mean of 100
        },
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(anomalousBehaviorData);

      expect(result.anomalies.length).toBeGreaterThan(0);
      const sessionAnomaly = result.anomalies.find(a => a.type === 'session_duration');
      expect(sessionAnomaly).toBeDefined();
      expect(sessionAnomaly.severity).toBe('critical');
    });

    it('should detect transaction amount anomaly', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 300, std: 50, min: 200, max: 400 },
          transactionAmount: { mean: 50, std: 10, min: 30, max: 80 },
          transactionFrequency: { mean: 1, std: 0.5, min: 1, max: 2 },
          timeOfDayPreference: { 14: 5 },
          dayOfWeekPreference: { 2: 5 },
          locationPatterns: [
            { country: 'US', city: 'San Francisco', coordinates: [-122.4194, 37.7749], frequency: 5 },
          ],
          devicePatterns: [],
          paymentMethodPreference: { credit_card: 5 },
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 80,
        sampleSize: 5,
        isActive: true,
      };

      // Create behavior data with anomalous transaction amount
      const anomalousBehaviorData = {
        ...mockBehaviorData,
        transactionData: {
          ...mockBehaviorData.transactionData,
          amount: 500, // Much higher than baseline mean of 50
        },
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(anomalousBehaviorData);

      expect(result.anomalies.length).toBeGreaterThan(0);
      const amountAnomaly = result.anomalies.find(a => a.type === 'transaction_amount');
      expect(amountAnomaly).toBeDefined();
      expect(amountAnomaly.severity).toMatch(/medium|high|critical/);
    });

    it('should detect location anomaly', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 300, std: 50, min: 200, max: 400 },
          transactionAmount: { mean: 100, std: 25, min: 50, max: 200 },
          transactionFrequency: { mean: 1, std: 0.5, min: 1, max: 2 },
          timeOfDayPreference: { 14: 5 },
          dayOfWeekPreference: { 2: 5 },
          locationPatterns: [
            { country: 'US', city: 'New York', coordinates: [-74.0060, 40.7128], frequency: 5 },
          ],
          devicePatterns: [],
          paymentMethodPreference: { credit_card: 5 },
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 80,
        sampleSize: 5,
        isActive: true,
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(mockBehaviorData);

      expect(result.anomalies.length).toBeGreaterThan(0);
      const locationAnomaly = result.anomalies.find(a => a.type === 'location_pattern');
      expect(locationAnomaly).toBeDefined();
      expect(locationAnomaly.severity).toBe('high');
    });

    it('should handle errors gracefully', async () => {
      mockBehavioralPatternRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.analyzeBehavior(mockBehaviorData)).rejects.toThrow('Database error');
    });

    it('should calculate appropriate risk scores', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 300, std: 50, min: 200, max: 400 },
          transactionAmount: { mean: 100, std: 25, min: 50, max: 200 },
          transactionFrequency: { mean: 1, std: 0.5, min: 1, max: 2 },
          timeOfDayPreference: { 14: 5 },
          dayOfWeekPreference: { 2: 5 },
          locationPatterns: [
            { country: 'US', city: 'San Francisco', coordinates: [-122.4194, 37.7749], frequency: 5 },
          ],
          devicePatterns: [{ fingerprint: 'device-123', type: 'desktop', frequency: 5 }],
          paymentMethodPreference: { credit_card: 5 },
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 80,
        sampleSize: 5,
        isActive: true,
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(mockBehaviorData);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(typeof result.riskScore).toBe('number');
    });

    it('should provide meaningful recommendations', async () => {
      const mockBaseline = {
        userId: 'user-123',
        baselineMetrics: {
          sessionDuration: { mean: 50, std: 10, min: 30, max: 80 }, // Low baseline
          transactionAmount: { mean: 25, std: 5, min: 10, max: 50 }, // Low baseline
          transactionFrequency: { mean: 1, std: 0.5, min: 1, max: 2 },
          timeOfDayPreference: { 10: 5 }, // Different time preference
          dayOfWeekPreference: { 1: 5 }, // Different day preference
          locationPatterns: [
            { country: 'CA', city: 'Toronto', coordinates: [-79.3832, 43.6532], frequency: 5 }, // Different location
          ],
          devicePatterns: [],
          paymentMethodPreference: { debit_card: 5 }, // Different payment method
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'low',
        confidenceScore: 80,
        sampleSize: 5,
        isActive: true,
      };

      mockBehavioralPatternRepository.findOne.mockResolvedValue(mockBaseline);
      mockBehavioralPatternRepository.save.mockResolvedValue({});

      const result = await service.analyzeBehavior(mockBehaviorData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.every(rec => typeof rec === 'string')).toBe(true);
    });
  });
});
