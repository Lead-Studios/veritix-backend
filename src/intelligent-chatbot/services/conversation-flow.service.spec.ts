import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationFlowService } from './conversation-flow.service';
import { NLPService } from './nlp.service';
import { RefundProcessingService } from './refund-processing.service';
import { EventLookupService } from './event-lookup.service';
import { EscalationService } from './escalation.service';
import { ChatAnalyticsService } from './chat-analytics.service';
import { ChatbotConversation, ConversationStatus } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage, MessageIntent } from '../entities/chatbot-message.entity';

describe('ConversationFlowService', () => {
  let service: ConversationFlowService;
  let conversationRepository: Repository<ChatbotConversation>;
  let messageRepository: Repository<ChatbotMessage>;
  let nlpService: NLPService;

  const mockConversationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockNLPService = {
    analyzeMessage: jest.fn(),
    generateResponse: jest.fn(),
  };

  const mockRefundService = {
    checkRefundEligibility: jest.fn(),
    processRefund: jest.fn(),
  };

  const mockEventService = {
    searchEvents: jest.fn(),
    getEventRecommendations: jest.fn(),
  };

  const mockEscalationService = {
    shouldEscalate: jest.fn(),
    escalateToHuman: jest.fn(),
  };

  const mockAnalyticsService = {
    recordConversationMetric: jest.fn(),
    recordMessageMetric: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationFlowService,
        {
          provide: getRepositoryToken(ChatbotConversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(ChatbotMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: NLPService,
          useValue: mockNLPService,
        },
        {
          provide: RefundProcessingService,
          useValue: mockRefundService,
        },
        {
          provide: EventLookupService,
          useValue: mockEventService,
        },
        {
          provide: EscalationService,
          useValue: mockEscalationService,
        },
        {
          provide: ChatAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<ConversationFlowService>(ConversationFlowService);
    conversationRepository = module.get<Repository<ChatbotConversation>>(
      getRepositoryToken(ChatbotConversation),
    );
    messageRepository = module.get<Repository<ChatbotMessage>>(
      getRepositoryToken(ChatbotMessage),
    );
    nlpService = module.get<NLPService>(NLPService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startConversation', () => {
    it('should create new conversation with greeting', async () => {
      const context = { userId: 'user-123', language: 'en' };
      const mockConversation = {
        id: 'conv-123',
        status: ConversationStatus.ACTIVE,
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.startConversation(context);

      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('greeting');
      expect(mockConversationRepository.create).toHaveBeenCalled();
      expect(mockConversationRepository.save).toHaveBeenCalled();
    });
  });

  describe('processMessage', () => {
    it('should process refund request message', async () => {
      const conversationId = 'conv-123';
      const message = 'I want a refund for my ticket';
      const context = { userId: 'user-123' };

      mockNLPService.analyzeMessage.mockResolvedValue({
        intent: MessageIntent.REFUND_REQUEST,
        confidence: 0.9,
        entities: { ticketId: 'ticket-123' },
        sentiment: -0.2,
        language: 'en',
      });

      mockRefundService.checkRefundEligibility.mockResolvedValue({
        eligible: true,
        reason: 'Within refund window',
      });

      mockNLPService.generateResponse.mockResolvedValue({
        message: 'I can help you with your refund request.',
        quickReplies: ['Yes, proceed', 'No, cancel'],
        actions: ['check_eligibility'],
      });

      const result = await service.processMessage(conversationId, message, context);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('quickReplies');
      expect(mockNLPService.analyzeMessage).toHaveBeenCalledWith(message, context);
    });

    it('should escalate when confidence is low', async () => {
      const conversationId = 'conv-123';
      const message = 'This is a complex issue';
      const context = { userId: 'user-123' };

      mockNLPService.analyzeMessage.mockResolvedValue({
        intent: MessageIntent.UNKNOWN,
        confidence: 0.2,
        entities: {},
        sentiment: 0,
        language: 'en',
      });

      mockEscalationService.shouldEscalate.mockReturnValue(true);
      mockEscalationService.escalateToHuman.mockResolvedValue({
        success: true,
        agentId: 'agent-123',
        estimatedWaitTime: 300,
      });

      const result = await service.processMessage(conversationId, message, context);

      expect(result.requiresEscalation).toBe(true);
      expect(mockEscalationService.escalateToHuman).toHaveBeenCalled();
    });
  });

  describe('endConversation', () => {
    it('should end conversation and update status', async () => {
      const conversationId = 'conv-123';
      const reason = 'User ended chat';

      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      await service.endConversation(conversationId, reason);

      expect(mockConversationRepository.update).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          status: ConversationStatus.ENDED,
          endReason: reason,
        }),
      );
    });
  });
});
