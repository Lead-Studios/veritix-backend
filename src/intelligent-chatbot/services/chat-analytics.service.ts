import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatbotAnalytics, AnalyticsMetricType } from '../entities/chatbot-analytics.entity';
import { ChatbotConversation, ConversationStatus } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage, MessageIntent } from '../entities/chatbot-message.entity';

export interface AnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  averageResolutionRate: number;
  averageEscalationRate: number;
  averageResponseTime: number;
  averageSatisfactionScore: number;
  topIntents: { intent: string; count: number }[];
  dailyMetrics: { date: string; conversations: number; resolutions: number }[];
}

export interface PerformanceMetrics {
  resolutionRate: number;
  escalationRate: number;
  averageResponseTime: number;
  userSatisfaction: number;
  intentAccuracy: number;
  conversationVolume: number;
}

@Injectable()
export class ChatAnalyticsService {
  constructor(
    @InjectRepository(ChatbotAnalytics)
    private analyticsRepository: Repository<ChatbotAnalytics>,
    @InjectRepository(ChatbotConversation)
    private conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotMessage)
    private messageRepository: Repository<ChatbotMessage>,
  ) {}

  async recordMetric(
    metricType: AnalyticsMetricType,
    value: number,
    metadata?: Record<string, any>,
    conversationId?: string,
  ): Promise<void> {
    await this.analyticsRepository.save({
      metricType,
      value,
      metadata,
      conversationId,
      date: new Date(),
    });
  }

  async getAnalyticsSummary(
    startDate: Date,
    endDate: Date,
    ownerId?: string,
  ): Promise<AnalyticsSummary> {
    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (ownerId) {
      whereCondition.ownerId = ownerId;
    }

    const [conversations, messages] = await Promise.all([
      this.conversationRepository.find({ where: whereCondition }),
      this.messageRepository.find({ where: whereCondition }),
    ]);

    const totalConversations = conversations.length;
    const totalMessages = messages.length;
    const resolvedConversations = conversations.filter(c => c.status === ConversationStatus.RESOLVED).length;
    const escalatedConversations = conversations.filter(c => c.isEscalated).length;

    const averageResolutionRate = totalConversations > 0 ? resolvedConversations / totalConversations : 0;
    const averageEscalationRate = totalConversations > 0 ? escalatedConversations / totalConversations : 0;

    const responseTimes = conversations
      .filter(c => c.botResponseTime > 0)
      .map(c => c.botResponseTime);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    const satisfactionScores = conversations
      .filter(c => c.satisfactionScore > 0)
      .map(c => c.satisfactionScore);
    const averageSatisfactionScore = satisfactionScores.length > 0
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0;

    const intentCounts = this.calculateIntentCounts(messages);
    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailyMetrics = await this.getDailyMetrics(startDate, endDate, ownerId);

    return {
      totalConversations,
      totalMessages,
      averageResolutionRate,
      averageEscalationRate,
      averageResponseTime,
      averageSatisfactionScore,
      topIntents,
      dailyMetrics,
    };
  }

  async getPerformanceMetrics(
    startDate: Date,
    endDate: Date,
    ownerId?: string,
  ): Promise<PerformanceMetrics> {
    const summary = await this.getAnalyticsSummary(startDate, endDate, ownerId);

    // Calculate intent accuracy from analytics data
    const intentAccuracyMetrics = await this.analyticsRepository.find({
      where: {
        metricType: AnalyticsMetricType.INTENT_ACCURACY,
        date: Between(startDate, endDate),
        ...(ownerId && { ownerId }),
      },
    });

    const averageIntentAccuracy = intentAccuracyMetrics.length > 0
      ? intentAccuracyMetrics.reduce((sum, metric) => sum + metric.value, 0) / intentAccuracyMetrics.length
      : 0.85; // Default assumption

    return {
      resolutionRate: summary.averageResolutionRate,
      escalationRate: summary.averageEscalationRate,
      averageResponseTime: summary.averageResponseTime,
      userSatisfaction: summary.averageSatisfactionScore,
      intentAccuracy: averageIntentAccuracy,
      conversationVolume: summary.totalConversations,
    };
  }

  async trackConversationMetrics(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages'],
    });

    if (!conversation) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Record conversation count
    await this.recordMetric(
      AnalyticsMetricType.CONVERSATION_COUNT,
      1,
      { conversationId },
      conversationId,
    );

    // Record message count
    await this.recordMetric(
      AnalyticsMetricType.MESSAGE_COUNT,
      conversation.messageCount,
      { conversationId },
      conversationId,
    );

    // Record response time
    if (conversation.botResponseTime > 0) {
      await this.recordMetric(
        AnalyticsMetricType.RESPONSE_TIME,
        conversation.botResponseTime,
        { conversationId },
        conversationId,
      );
    }

    // Record satisfaction if available
    if (conversation.satisfactionScore > 0) {
      await this.recordMetric(
        AnalyticsMetricType.USER_SATISFACTION,
        conversation.satisfactionScore,
        { conversationId },
        conversationId,
      );
    }

    // Record resolution/escalation
    if (conversation.status === ConversationStatus.RESOLVED) {
      await this.recordMetric(
        AnalyticsMetricType.RESOLUTION_RATE,
        1,
        { conversationId, resolved: true },
        conversationId,
      );
    }

    if (conversation.isEscalated) {
      await this.recordMetric(
        AnalyticsMetricType.ESCALATION_RATE,
        1,
        { conversationId, escalated: true },
        conversationId,
      );
    }
  }

  async getIntentAnalytics(
    startDate: Date,
    endDate: Date,
    ownerId?: string,
  ): Promise<{ intent: string; count: number; accuracy: number }[]> {
    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
      intent: { $ne: null },
    };

    if (ownerId) {
      whereCondition.ownerId = ownerId;
    }

    const messages = await this.messageRepository.find({
      where: whereCondition,
    });

    const intentStats: Record<string, { count: number; correctPredictions: number }> = {};

    messages.forEach(message => {
      if (!message.intent) return;

      const intent = message.intent;
      if (!intentStats[intent]) {
        intentStats[intent] = { count: 0, correctPredictions: 0 };
      }

      intentStats[intent].count++;
      
      // Assume high confidence predictions are correct
      if (message.confidence && message.confidence > 0.8) {
        intentStats[intent].correctPredictions++;
      }
    });

    return Object.entries(intentStats).map(([intent, stats]) => ({
      intent,
      count: stats.count,
      accuracy: stats.count > 0 ? stats.correctPredictions / stats.count : 0,
    }));
  }

  async generateDailyReport(date: Date, ownerId?: string): Promise<Record<string, any>> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const summary = await this.getAnalyticsSummary(startDate, endDate, ownerId);
    const performance = await this.getPerformanceMetrics(startDate, endDate, ownerId);
    const intentAnalytics = await this.getIntentAnalytics(startDate, endDate, ownerId);

    return {
      date: date.toISOString().split('T')[0],
      summary,
      performance,
      intentAnalytics,
      insights: this.generateInsights(performance, intentAnalytics),
    };
  }

  private calculateIntentCounts(messages: ChatbotMessage[]): Record<string, number> {
    const counts: Record<string, number> = {};

    messages.forEach(message => {
      if (message.intent) {
        counts[message.intent] = (counts[message.intent] || 0) + 1;
      }
    });

    return counts;
  }

  private async getDailyMetrics(
    startDate: Date,
    endDate: Date,
    ownerId?: string,
  ): Promise<{ date: string; conversations: number; resolutions: number }[]> {
    const metrics: { date: string; conversations: number; resolutions: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const whereCondition: any = {
        createdAt: Between(dayStart, dayEnd),
      };

      if (ownerId) {
        whereCondition.ownerId = ownerId;
      }

      const [conversations, resolvedConversations] = await Promise.all([
        this.conversationRepository.count({ where: whereCondition }),
        this.conversationRepository.count({
          where: { ...whereCondition, status: ConversationStatus.RESOLVED },
        }),
      ]);

      metrics.push({
        date: currentDate.toISOString().split('T')[0],
        conversations,
        resolutions: resolvedConversations,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return metrics;
  }

  private generateInsights(
    performance: PerformanceMetrics,
    intentAnalytics: { intent: string; count: number; accuracy: number }[],
  ): string[] {
    const insights: string[] = [];

    if (performance.resolutionRate < 0.7) {
      insights.push('Resolution rate is below target (70%). Consider improving bot responses.');
    }

    if (performance.escalationRate > 0.3) {
      insights.push('Escalation rate is high (>30%). Review common escalation triggers.');
    }

    if (performance.averageResponseTime > 5000) {
      insights.push('Response time is slow (>5s). Consider optimizing NLP processing.');
    }

    const lowAccuracyIntents = intentAnalytics.filter(intent => intent.accuracy < 0.8);
    if (lowAccuracyIntents.length > 0) {
      insights.push(`Intent accuracy is low for: ${lowAccuracyIntents.map(i => i.intent).join(', ')}`);
    }

    if (performance.userSatisfaction < 4.0) {
      insights.push('User satisfaction is below target (4.0). Review conversation quality.');
    }

    return insights;
  }
}
