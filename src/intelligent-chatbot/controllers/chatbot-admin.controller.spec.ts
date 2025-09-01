import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotAdminController } from './chatbot-admin.controller';
import { NLPService } from '../services/nlp.service';
import { ChatAnalyticsService } from '../services/chat-analytics.service';
import { ChatbotTrainingData, TrainingDataStatus, TrainingDataType } from '../entities/chatbot-training-data.entity';

describe('ChatbotAdminController', () => {
  let controller: ChatbotAdminController;
  let trainingDataRepository: Repository<ChatbotTrainingData>;
  let nlpService: NLPService;
  let analyticsService: ChatAnalyticsService;

  const mockTrainingDataRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNLPService = {
    analyzeMessage: jest.fn(),
  };

  const mockAnalyticsService = {
    getAnalyticsSummary: jest.fn(),
    getPerformanceMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotAdminController],
      providers: [
        {
          provide: getRepositoryToken(ChatbotTrainingData),
          useValue: mockTrainingDataRepository,
        },
        {
          provide: NLPService,
          useValue: mockNLPService,
        },
        {
          provide: ChatAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<ChatbotAdminController>(ChatbotAdminController);
    trainingDataRepository = module.get<Repository<ChatbotTrainingData>>(
      getRepositoryToken(ChatbotTrainingData),
    );
    nlpService = module.get<NLPService>(NLPService);
    analyticsService = module.get<ChatAnalyticsService>(ChatAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTrainingData', () => {
    it('should create new training data', async () => {
      const dto = {
        type: TrainingDataType.INTENT,
        intent: 'refund_request',
        input: 'I want a refund',
        expectedOutput: 'I can help you with your refund request.',
        language: 'en',
      };
      const req = { user: { ownerId: 'org-123' } };

      const mockTrainingData = {
        id: 'training-123',
        ...dto,
        ownerId: 'org-123',
        status: TrainingDataStatus.ACTIVE,
        usageCount: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTrainingDataRepository.create.mockReturnValue(mockTrainingData);
      mockTrainingDataRepository.save.mockResolvedValue(mockTrainingData);

      const result = await controller.createTrainingData(dto, req);

      expect(result).toHaveProperty('id');
      expect(result.intent).toBe('refund_request');
      expect(mockTrainingDataRepository.create).toHaveBeenCalled();
      expect(mockTrainingDataRepository.save).toHaveBeenCalled();
    });
  });

  describe('getTrainingData', () => {
    it('should return paginated training data', async () => {
      const req = { user: { ownerId: 'org-123' } };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockTrainingDataRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await controller.getTrainingData(req);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });
  });

  describe('testIntent', () => {
    it('should test intent detection', async () => {
      const intent = 'refund_request';
      const testData = { message: 'I need a refund', language: 'en' };
      const req = { user: { ownerId: 'org-123' } };

      mockNLPService.analyzeMessage.mockResolvedValue({
        intent: 'refund_request',
        confidence: 0.9,
        entities: {},
        sentiment: 0,
        language: 'en',
      });

      const result = await controller.testIntent(intent, testData, req);

      expect(result.detectedIntent).toBe('refund_request');
      expect(result.expectedIntent).toBe('refund_request');
      expect(result.match).toBe(true);
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('trainModel', () => {
    it('should initiate model training with sufficient data', async () => {
      const req = { user: { ownerId: 'org-123' } };

      mockTrainingDataRepository.count.mockResolvedValue(25);

      const result = await controller.trainModel(req);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Training initiated');
    });

    it('should reject training with insufficient data', async () => {
      const req = { user: { ownerId: 'org-123' } };

      mockTrainingDataRepository.count.mockResolvedValue(5);

      const result = await controller.trainModel(req);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient training data');
    });
  });
});
