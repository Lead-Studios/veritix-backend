import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotConversation, ConversationStatus } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage, MessageType, MessageIntent } from '../entities/chatbot-message.entity';
import { NLPService } from './nlp.service';
import { RefundProcessingService } from './refund-processing.service';
import { EventLookupService } from './event-lookup.service';
import { EscalationService } from './escalation.service';

export interface ConversationContext {
  userId?: string;
  sessionId?: string;
  language?: string;
  userProfile?: Record<string, any>;
  currentIntent?: MessageIntent;
  entities?: Record<string, any>;
}

export interface ChatResponse {
  message: string;
  quickReplies?: string[];
  actions?: string[];
  requiresEscalation?: boolean;
  conversationEnded?: boolean;
}

@Injectable()
export class ConversationFlowService {
  constructor(
    @InjectRepository(ChatbotConversation)
    private conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotMessage)
    private messageRepository: Repository<ChatbotMessage>,
    private nlpService: NLPService,
    private refundService: RefundProcessingService,
    private eventLookupService: EventLookupService,
    private escalationService: EscalationService,
  ) {}

  async processMessage(
    conversationId: string,
    message: string,
    context: ConversationContext,
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get or create conversation
    let conversation = await this.getOrCreateConversation(conversationId, context);

    // Analyze message with NLP
    const analysis = await this.nlpService.analyzeMessage(message, conversation.context);

    // Save user message
    await this.saveMessage(conversation.id, {
      type: MessageType.USER,
      content: message,
      intent: analysis.intent,
      confidence: analysis.confidence,
      entities: analysis.entities,
      sentimentScore: analysis.sentiment,
      originalLanguage: analysis.language,
    });

    // Process intent and generate response
    const response = await this.processIntent(analysis, conversation, context);

    // Save bot response
    const processingTime = Date.now() - startTime;
    await this.saveMessage(conversation.id, {
      type: MessageType.BOT,
      content: response.message,
      intent: analysis.intent,
      processingTime,
      actions: response.actions,
      quickReplies: response.quickReplies,
    });

    // Update conversation
    await this.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      messageCount: conversation.messageCount + 2,
      botResponseTime: Math.round((conversation.botResponseTime + processingTime) / 2),
      status: response.conversationEnded ? ConversationStatus.RESOLVED : conversation.status,
    });

    return response;
  }

  async startConversation(context: ConversationContext): Promise<{ conversationId: string; greeting: string }> {
    const conversation = await this.conversationRepository.save({
      userId: context.userId,
      sessionId: context.sessionId,
      language: context.language || 'en',
      userProfile: context.userProfile,
      status: ConversationStatus.ACTIVE,
      lastMessageAt: new Date(),
    });

    const greeting = await this.nlpService.generateResponse(
      'start conversation',
      MessageIntent.GREETING,
      context,
      context.language,
    );

    await this.saveMessage(conversation.id, {
      type: MessageType.BOT,
      content: greeting,
      intent: MessageIntent.GREETING,
    });

    return {
      conversationId: conversation.id,
      greeting,
    };
  }

  private async processIntent(
    analysis: any,
    conversation: ChatbotConversation,
    context: ConversationContext,
  ): Promise<ChatResponse> {
    switch (analysis.intent) {
      case MessageIntent.REFUND_REQUEST:
        return this.handleRefundRequest(analysis, conversation, context);
      
      case MessageIntent.EXCHANGE_REQUEST:
        return this.handleExchangeRequest(analysis, conversation, context);
      
      case MessageIntent.EVENT_INFO:
        return this.handleEventInquiry(analysis, conversation, context);
      
      case MessageIntent.TICKET_INQUIRY:
        return this.handleTicketInquiry(analysis, conversation, context);
      
      case MessageIntent.ESCALATION_REQUEST:
        return this.handleEscalationRequest(analysis, conversation, context);
      
      case MessageIntent.COMPLAINT:
        return this.handleComplaint(analysis, conversation, context);
      
      case MessageIntent.GREETING:
        return this.handleGreeting(analysis, conversation, context);
      
      case MessageIntent.GOODBYE:
        return this.handleGoodbye(analysis, conversation, context);
      
      default:
        return this.handleUnknownIntent(analysis, conversation, context);
    }
  }

  private async handleRefundRequest(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    const ticketId = analysis.entities.ticketId?.[0];
    
    if (!ticketId) {
      return {
        message: 'I can help you with a refund. Please provide your ticket or order ID.',
        quickReplies: ['I have my ticket ID', 'I don\'t have my ticket ID', 'Speak to agent'],
      };
    }

    const refundResult = await this.refundService.processAutomatedRefund(ticketId, context.userId);
    
    if (refundResult.success) {
      return {
        message: `Your refund request has been processed successfully. You'll receive $${refundResult.amount} back to your original payment method within 3-5 business days.`,
        actions: ['refund_processed'],
      };
    } else {
      return {
        message: `I'm unable to process your refund automatically. ${refundResult.reason} I'll connect you with an agent who can help.`,
        requiresEscalation: true,
        actions: ['escalate_refund'],
      };
    }
  }

  private async handleExchangeRequest(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    return {
      message: 'I can help you exchange your tickets. Please provide your current ticket ID and let me know what you\'d like to change to.',
      quickReplies: ['Different date', 'Different seat', 'Different event', 'Speak to agent'],
      actions: ['exchange_initiated'],
    };
  }

  private async handleEventInquiry(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    const eventInfo = await this.eventLookupService.searchEvents(analysis.entities);
    
    if (eventInfo.length > 0) {
      const event = eventInfo[0];
      return {
        message: `Here's information about ${event.name}: ${event.description}. The event is on ${event.date} at ${event.venue}.`,
        quickReplies: ['Buy tickets', 'More details', 'Other events'],
        actions: ['event_info_provided'],
      };
    }

    return {
      message: 'I can help you find event information. What specific event are you looking for?',
      quickReplies: ['Browse events', 'Search by date', 'Search by location'],
    };
  }

  private async handleTicketInquiry(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    const ticketId = analysis.entities.ticketId?.[0];
    
    if (ticketId) {
      // Look up ticket information
      return {
        message: 'Let me look up your ticket information. Please wait a moment...',
        actions: ['ticket_lookup'],
      };
    }

    return {
      message: 'I can help you with your ticket inquiry. Please provide your ticket or order ID.',
      quickReplies: ['I have my ticket ID', 'I don\'t have my ticket ID', 'Email confirmation'],
    };
  }

  private async handleEscalationRequest(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    await this.escalationService.escalateToHuman(conversation.id, 'user_requested');
    
    return {
      message: 'I\'m connecting you with a human agent who can better assist you. Please wait a moment.',
      requiresEscalation: true,
      actions: ['escalated_to_human'],
    };
  }

  private async handleComplaint(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    const severity = analysis.sentiment < -0.5 ? 'high' : 'medium';
    
    if (severity === 'high') {
      await this.escalationService.escalateToHuman(conversation.id, 'high_priority_complaint');
      return {
        message: 'I\'m sorry to hear about your experience. I\'m connecting you with a supervisor who can address your concerns immediately.',
        requiresEscalation: true,
        actions: ['escalated_complaint'],
      };
    }

    return {
      message: 'I\'m sorry to hear about your concern. I\'d like to help resolve this issue. Can you provide more details about what happened?',
      quickReplies: ['Technical issue', 'Billing problem', 'Event issue', 'Speak to manager'],
      actions: ['complaint_acknowledged'],
    };
  }

  private async handleGreeting(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    return {
      message: `${greeting}! I'm the Veritix AI assistant. How can I help you today?`,
      quickReplies: ['Ticket inquiry', 'Refund request', 'Event information', 'Technical support'],
      actions: ['greeting_sent'],
    };
  }

  private async handleGoodbye(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    return {
      message: 'Thank you for contacting Veritix! If you need further assistance, feel free to start a new conversation. Have a great day!',
      conversationEnded: true,
      actions: ['conversation_ended'],
    };
  }

  private async handleUnknownIntent(analysis: any, conversation: ChatbotConversation, context: ConversationContext): Promise<ChatResponse> {
    return {
      message: 'I\'m not sure I understand your request. Could you please rephrase or choose from the options below?',
      quickReplies: ['Ticket help', 'Refund request', 'Event info', 'Speak to agent'],
      actions: ['clarification_requested'],
    };
  }

  private async getOrCreateConversation(
    conversationId: string,
    context: ConversationContext,
  ): Promise<ChatbotConversation> {
    let conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      conversation = await this.conversationRepository.save({
        id: conversationId,
        userId: context.userId,
        sessionId: context.sessionId,
        language: context.language || 'en',
        userProfile: context.userProfile,
        status: ConversationStatus.ACTIVE,
        messageCount: 0,
        botResponseTime: 0,
      });
    }

    return conversation;
  }

  private async saveMessage(conversationId: string, messageData: Partial<ChatbotMessage>): Promise<ChatbotMessage> {
    const message = this.messageRepository.create({
      ...messageData,
      conversationId,
      isProcessed: true,
    });

    return this.messageRepository.save(message);
  }

  private async updateConversation(conversationId: string, updates: Partial<ChatbotConversation>): Promise<void> {
    await this.conversationRepository.update(conversationId, updates);
  }
}
