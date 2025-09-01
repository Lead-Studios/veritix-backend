import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NLPService } from './nlp.service';
import { MessageIntent } from '../entities/chatbot-message.entity';

describe('NLPService', () => {
  let service: NLPService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NLPService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NLPService>(NLPService);
    configService = module.get<ConfigService>(ConfigService);

    mockConfigService.get.mockReturnValue('test-api-key');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeMessage', () => {
    it('should analyze message and return NLP analysis', async () => {
      const message = 'I want to request a refund for my ticket';
      
      const result = await service.analyzeMessage(message);
      
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('language');
    });

    it('should handle analysis errors gracefully', async () => {
      const message = '';
      
      const result = await service.analyzeMessage(message);
      
      expect(result.intent).toBe(MessageIntent.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('generateResponse', () => {
    it('should generate appropriate response for refund intent', async () => {
      const message = 'I need a refund';
      const intent = MessageIntent.REFUND_REQUEST;
      
      const result = await service.generateResponse(message, intent);
      
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('quickReplies');
      expect(result.message).toContain('refund');
    });

    it('should generate greeting response', async () => {
      const message = 'Hello';
      const intent = MessageIntent.GREETING;
      
      const result = await service.generateResponse(message, intent);
      
      expect(result.message).toMatch(/hello|hi|welcome/i);
    });
  });

  describe('detectLanguage', () => {
    it('should detect English language', () => {
      const message = 'Hello, how are you today?';
      
      const language = service.detectLanguage(message);
      
      expect(language).toBe('en');
    });

    it('should detect Spanish language', () => {
      const message = 'Hola, ¿cómo estás hoy?';
      
      const language = service.detectLanguage(message);
      
      expect(language).toBe('es');
    });
  });

  describe('analyzeSentiment', () => {
    it('should return positive sentiment for positive message', () => {
      const message = 'I love this event! It was amazing!';
      
      const sentiment = service.analyzeSentiment(message);
      
      expect(sentiment).toBeGreaterThan(0);
    });

    it('should return negative sentiment for negative message', () => {
      const message = 'This event was terrible and disappointing';
      
      const sentiment = service.analyzeSentiment(message);
      
      expect(sentiment).toBeLessThan(0);
    });
  });
});
