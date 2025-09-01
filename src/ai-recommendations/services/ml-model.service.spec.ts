import { Test, TestingModule } from '@nestjs/testing';
import { MLModelService } from './ml-model.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('MLModelService', () => {
  let service: MLModelService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserData = {
    userId: 'user-123',
    demographics: { age: 25, location: 'San Francisco' },
    preferences: [
      { type: 'categories', value: ['Technology', 'Music'], weight: 0.8 },
    ],
    interactions: [
      { eventId: 'event-123', type: 'click', timestamp: new Date() },
    ],
  };

  const mockEventData = {
    eventId: 'event-123',
    features: {
      category: 'Technology',
      price: 50,
      location: 'San Francisco',
      rating: 4.5,
    },
  };

  const mockPrediction = {
    eventId: 'event-123',
    score: 0.85,
    confidence: 0.9,
    factors: ['category_match', 'location_proximity'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MLModelService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MLModelService>(MLModelService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);

    configService.get.mockImplementation((key: string) => {
      const config = {
        ML_API_URL: 'http://localhost:8000',
        ML_API_KEY: 'test-api-key',
        ML_MODEL_VERSION: 'v1.0',
      };
      return config[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictUserPreferences', () => {
    it('should predict user preferences successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          predictions: [
            { category: 'Technology', score: 0.85 },
            { category: 'Music', score: 0.75 },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.predictUserPreferences(mockUserData);

      expect(result).toEqual({
        predictions: [
          { category: 'Technology', score: 0.85 },
          { category: 'Music', score: 0.75 },
        ],
      });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/predict/preferences',
        mockUserData,
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should handle ML API errors gracefully', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('ML API error')));

      await expect(service.predictUserPreferences(mockUserData))
        .rejects.toThrow('Failed to predict user preferences: ML API error');
    });

    it('should handle invalid response format', async () => {
      const mockResponse: AxiosResponse = {
        data: { invalid: 'response' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse));

      await expect(service.predictUserPreferences(mockUserData))
        .rejects.toThrow('Invalid response format from ML API');
    });
  });

  describe('scoreEventRelevance', () => {
    it('should score event relevance successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: mockPrediction,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.scoreEventRelevance(mockUserData, mockEventData);

      expect(result).toEqual(mockPrediction);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/score/relevance',
        {
          user: mockUserData,
          event: mockEventData,
        },
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should handle scoring errors', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Scoring failed')));

      await expect(service.scoreEventRelevance(mockUserData, mockEventData))
        .rejects.toThrow('Failed to score event relevance: Scoring failed');
    });
  });

  describe('batchScoreEvents', () => {
    it('should batch score multiple events', async () => {
      const events = [mockEventData, { ...mockEventData, eventId: 'event-456' }];
      const mockResponse: AxiosResponse = {
        data: {
          scores: [
            mockPrediction,
            { ...mockPrediction, eventId: 'event-456', score: 0.75 },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.batchScoreEvents(mockUserData, events);

      expect(result).toEqual({
        scores: [
          mockPrediction,
          { ...mockPrediction, eventId: 'event-456', score: 0.75 },
        ],
      });
    });

    it('should handle empty events array', async () => {
      const result = await service.batchScoreEvents(mockUserData, []);

      expect(result).toEqual({ scores: [] });
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe('trainModel', () => {
    it('should trigger model training successfully', async () => {
      const trainingData = {
        interactions: [mockUserData],
        events: [mockEventData],
        outcomes: [{ userId: 'user-123', eventId: 'event-123', purchased: true }],
      };

      const mockResponse: AxiosResponse = {
        data: {
          trainingId: 'training-123',
          status: 'started',
          estimatedDuration: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.trainModel(trainingData);

      expect(result).toEqual({
        trainingId: 'training-123',
        status: 'started',
        estimatedDuration: 3600,
      });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/train',
        trainingData,
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should handle training errors', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Training failed')));

      await expect(service.trainModel({ interactions: [], events: [], outcomes: [] }))
        .rejects.toThrow('Failed to train model: Training failed');
    });
  });

  describe('getModelStatus', () => {
    it('should return model status', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          version: 'v1.2',
          status: 'active',
          accuracy: 0.92,
          lastTrained: new Date().toISOString(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getModelStatus();

      expect(result).toEqual({
        version: 'v1.2',
        status: 'active',
        accuracy: 0.92,
        lastTrained: expect.any(String),
      });
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:8000/model/status',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        },
      );
    });

    it('should handle status check errors', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('Status check failed')));

      await expect(service.getModelStatus())
        .rejects.toThrow('Failed to get model status: Status check failed');
    });
  });

  describe('generateFeatureVector', () => {
    it('should generate feature vector for user', async () => {
      const result = service.generateFeatureVector(mockUserData);

      expect(result).toEqual({
        demographics: mockUserData.demographics,
        categoryPreferences: expect.any(Object),
        interactionFrequency: expect.any(Number),
        avgSessionDuration: expect.any(Number),
        preferredTimeSlots: expect.any(Array),
        priceRange: expect.any(Object),
        locationPreference: expect.any(String),
      });
    });

    it('should handle missing user data gracefully', async () => {
      const incompleteUserData = {
        userId: 'user-456',
        demographics: {},
        preferences: [],
        interactions: [],
      };

      const result = service.generateFeatureVector(incompleteUserData);

      expect(result).toBeDefined();
      expect(result.demographics).toEqual({});
      expect(result.categoryPreferences).toEqual({});
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between users', async () => {
      const user1Vector = {
        demographics: { age: 25 },
        categoryPreferences: { Technology: 0.8, Music: 0.6 },
        interactionFrequency: 10,
        avgSessionDuration: 300,
        preferredTimeSlots: [18, 19, 20],
        priceRange: { min: 20, max: 100 },
        locationPreference: 'San Francisco',
      };

      const user2Vector = {
        demographics: { age: 27 },
        categoryPreferences: { Technology: 0.9, Music: 0.4 },
        interactionFrequency: 12,
        avgSessionDuration: 280,
        preferredTimeSlots: [19, 20, 21],
        priceRange: { min: 30, max: 120 },
        locationPreference: 'San Francisco',
      };

      const similarity = service.calculateSimilarity(user1Vector, user2Vector);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 0 similarity for completely different users', async () => {
      const user1Vector = {
        demographics: { age: 25 },
        categoryPreferences: { Technology: 1.0 },
        interactionFrequency: 10,
        avgSessionDuration: 300,
        preferredTimeSlots: [18],
        priceRange: { min: 20, max: 50 },
        locationPreference: 'San Francisco',
      };

      const user2Vector = {
        demographics: { age: 65 },
        categoryPreferences: { Sports: 1.0 },
        interactionFrequency: 1,
        avgSessionDuration: 60,
        preferredTimeSlots: [10],
        priceRange: { min: 200, max: 500 },
        locationPreference: 'New York',
      };

      const similarity = service.calculateSimilarity(user1Vector, user2Vector);

      expect(similarity).toBeLessThan(0.3);
    });
  });
});
