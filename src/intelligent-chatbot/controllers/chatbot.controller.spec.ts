import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotController } from './chatbot.controller';
import { ConversationFlowService } from '../services/conversation-flow.service';
import { ChatAnalyticsService } from '../services/chat-analytics.service';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let conversationService: ConversationFlowService;
  let analyticsService: ChatAnalyticsService;

  const mockConversationService = {
    startConversation: jest.fn(),
    processMessage: jest.fn(),
  };

  const mockAnalyticsService = {
    getAnalyticsSummary: jest.fn(),
    getPerformanceMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [
        {
          provide: ConversationFlowService,
          useValue: mockConversationService,
        },
        {
          provide: ChatAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<ChatbotController>(ChatbotController);
    conversationService = module.get<ConversationFlowService>(ConversationFlowService);
    analyticsService = module.get<ChatAnalyticsService>(ChatAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startConversation', () => {
    it('should start a new conversation', async () => {
      const dto = { language: 'en' };
      const req = { user: { userId: 'user-123' }, sessionId: 'session-123' };
      
      mockConversationService.startConversation.mockResolvedValue({
        conversationId: 'conv-123',
        greeting: 'Hello! How can I help you today?',
      });

      const result = await controller.startConversation(dto, req);

      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('greeting');
      expect(mockConversationService.startConversation).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: 'session-123',
        language: 'en',
        userProfile: undefined,
      });
    });
  });

  describe('sendMessage', () => {
    it('should process message and return response', async () => {
      const dto = {
        message: 'I need help with my ticket',
        conversationId: 'conv-123',
        language: 'en',
      };
      const req = { user: { userId: 'user-123' }, sessionId: 'session-123' };

      mockConversationService.processMessage.mockResolvedValue({
        message: 'I can help you with your ticket. What specific issue are you experiencing?',
        quickReplies: ['Refund', 'Exchange', 'Transfer'],
        actions: ['show_ticket_options'],
        requiresEscalation: false,
        conversationEnded: false,
      });

      const result = await controller.sendMessage(dto, req);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('quickReplies');
      expect(mockConversationService.processMessage).toHaveBeenCalled();
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary', async () => {
      const req = { user: { ownerId: 'org-123' } };
      const mockSummary = {
        totalConversations: 150,
        averageResponseTime: 2.5,
        resolutionRate: 0.85,
        escalationRate: 0.15,
      };

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const result = await controller.getAnalyticsSummary('2024-01-01', '2024-01-31', req);

      expect(result).toEqual(mockSummary);
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'org-123',
      );
    });
  });
});
