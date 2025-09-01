import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotConversation, ConversationStatus, ConversationPriority } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage, MessageType } from '../entities/chatbot-message.entity';

export interface EscalationResult {
  success: boolean;
  agentId?: string;
  estimatedWaitTime?: number;
  ticketNumber?: string;
}

export interface AgentAvailability {
  agentId: string;
  name: string;
  specialties: string[];
  currentLoad: number;
  maxCapacity: number;
  averageResponseTime: number;
}

@Injectable()
export class EscalationService {
  constructor(
    @InjectRepository(ChatbotConversation)
    private conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotMessage)
    private messageRepository: Repository<ChatbotMessage>,
  ) {}

  async escalateToHuman(
    conversationId: string,
    reason: string,
    priority: ConversationPriority = ConversationPriority.MEDIUM,
  ): Promise<EscalationResult> {
    try {
      // Find available agent
      const agent = await this.findAvailableAgent(priority);
      
      if (!agent) {
        return {
          success: false,
          estimatedWaitTime: await this.getEstimatedWaitTime(priority),
        };
      }

      // Update conversation status
      await this.conversationRepository.update(conversationId, {
        status: ConversationStatus.ESCALATED,
        isEscalated: true,
        escalatedTo: agent.agentId,
        escalatedAt: new Date(),
        escalationReason: reason,
        priority,
      });

      // Add escalation message
      await this.messageRepository.save({
        conversationId,
        type: MessageType.ESCALATION,
        content: `Conversation escalated to human agent: ${agent.name}`,
        metadata: {
          agentId: agent.agentId,
          reason,
          priority,
        },
      });

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber();

      return {
        success: true,
        agentId: agent.agentId,
        estimatedWaitTime: agent.averageResponseTime,
        ticketNumber,
      };
    } catch (error) {
      console.error('Escalation failed:', error);
      return {
        success: false,
        estimatedWaitTime: 30, // 30 minutes fallback
      };
    }
  }

  async checkEscalationCriteria(
    conversationId: string,
    messageCount: number,
    sentiment: number,
    intent: string,
  ): Promise<boolean> {
    // Auto-escalate if:
    // 1. Very negative sentiment (< -0.7)
    // 2. More than 10 messages without resolution
    // 3. Specific escalation keywords
    // 4. Complex refund/exchange requests

    if (sentiment < -0.7) return true;
    if (messageCount > 10) return true;
    
    const escalationIntents = [
      'escalation_request',
      'complaint',
      'complex_refund',
      'technical_issue',
    ];
    
    if (escalationIntents.includes(intent)) return true;

    return false;
  }

  async getEscalationQueue(priority?: ConversationPriority): Promise<ChatbotConversation[]> {
    const whereCondition: any = {
      status: ConversationStatus.ESCALATED,
      isEscalated: true,
    };

    if (priority) {
      whereCondition.priority = priority;
    }

    return this.conversationRepository.find({
      where: whereCondition,
      relations: ['user', 'messages'],
      order: { escalatedAt: 'ASC' },
    });
  }

  async assignAgentToConversation(
    conversationId: string,
    agentId: string,
  ): Promise<void> {
    await this.conversationRepository.update(conversationId, {
      escalatedTo: agentId,
      escalatedAt: new Date(),
    });

    await this.messageRepository.save({
      conversationId,
      type: MessageType.SYSTEM,
      content: `Agent ${agentId} has joined the conversation`,
      metadata: { agentId },
    });
  }

  async getConversationSummary(conversationId: string): Promise<string> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages', 'user'],
    });

    if (!conversation) return 'Conversation not found';

    const messages = conversation.messages
      .filter(msg => msg.type !== MessageType.SYSTEM)
      .slice(-10); // Last 10 messages

    const summary = messages
      .map(msg => `${msg.type.toUpperCase()}: ${msg.content}`)
      .join('\n');

    return `
Conversation Summary:
User: ${conversation.user?.email || 'Anonymous'}
Status: ${conversation.status}
Priority: ${conversation.priority}
Category: ${conversation.category || 'General'}
Message Count: ${conversation.messageCount}

Recent Messages:
${summary}

Context: ${JSON.stringify(conversation.context || {})}
    `.trim();
  }

  private async findAvailableAgent(priority: ConversationPriority): Promise<AgentAvailability | null> {
    // Mock agent availability - in real implementation, this would query agent status
    const mockAgents: AgentAvailability[] = [
      {
        agentId: 'agent-1',
        name: 'Sarah Johnson',
        specialties: ['refunds', 'billing'],
        currentLoad: 3,
        maxCapacity: 5,
        averageResponseTime: 5, // minutes
      },
      {
        agentId: 'agent-2',
        name: 'Mike Chen',
        specialties: ['technical', 'events'],
        currentLoad: 2,
        maxCapacity: 4,
        averageResponseTime: 8,
      },
      {
        agentId: 'agent-3',
        name: 'Lisa Rodriguez',
        specialties: ['complaints', 'escalations'],
        currentLoad: 1,
        maxCapacity: 3,
        averageResponseTime: 3,
      },
    ];

    // Filter available agents
    const availableAgents = mockAgents.filter(agent => agent.currentLoad < agent.maxCapacity);

    if (availableAgents.length === 0) return null;

    // Prioritize based on priority level
    if (priority === ConversationPriority.URGENT) {
      return availableAgents.find(agent => agent.specialties.includes('escalations')) || availableAgents[0];
    }

    // Return agent with lowest current load
    return availableAgents.sort((a, b) => a.currentLoad - b.currentLoad)[0];
  }

  private async getEstimatedWaitTime(priority: ConversationPriority): Promise<number> {
    const queueLength = await this.conversationRepository.count({
      where: {
        status: ConversationStatus.ESCALATED,
        priority,
      },
    });

    // Base wait time calculation
    const baseWaitTime = {
      [ConversationPriority.URGENT]: 5,
      [ConversationPriority.HIGH]: 15,
      [ConversationPriority.MEDIUM]: 30,
      [ConversationPriority.LOW]: 60,
    };

    return baseWaitTime[priority] + (queueLength * 10);
  }

  private async generateTicketNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `VTX-${timestamp}-${random}`;
  }

  async updateEscalationMetrics(conversationId: string, resolved: boolean): Promise<void> {
    // Track escalation metrics for analytics
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (conversation?.isEscalated) {
      const escalationTime = conversation.escalatedAt 
        ? Date.now() - conversation.escalatedAt.getTime()
        : 0;

      // Update conversation with resolution metrics
      await this.conversationRepository.update(conversationId, {
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? 'agent' : null,
      });
    }
  }
}
