import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  Put,
} from '@nestjs/common';
import { ConversationFlowService } from '../services/conversation-flow.service';
import { ChatAnalyticsService } from '../services/chat-analytics.service';
import { SendMessageDto, ChatResponseDto, StartConversationDto } from '../dto/chat-message.dto';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private conversationService: ConversationFlowService,
    private analyticsService: ChatAnalyticsService,
  ) {}

  @Post('start')
  async startConversation(
    @Body() dto: StartConversationDto,
    @Request() req,
  ): Promise<{ conversationId: string; greeting: string }> {
    const context = {
      userId: req.user?.userId,
      sessionId: req.sessionId,
      language: dto.language || 'en',
      userProfile: dto.userProfile,
    };

    return this.conversationService.startConversation(context);
  }

  @Post('message')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req,
  ): Promise<ChatResponseDto> {
    const conversationId = dto.conversationId || uuidv4();
    
    const context = {
      userId: req.user?.userId,
      sessionId: req.sessionId,
      language: dto.language || 'en',
    };

    const response = await this.conversationService.processMessage(
      conversationId,
      dto.message,
      context,
    );

    return {
      message: response.message,
      conversationId,
      messageId: uuidv4(),
      quickReplies: response.quickReplies,
      actions: response.actions,
      requiresEscalation: response.requiresEscalation,
      conversationEnded: response.conversationEnded,
    };
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  async getUserConversations(@Request() req) {
    // Implementation would fetch user's conversation history
    return { conversations: [] };
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  async getConversation(
    @Param('id') conversationId: string,
    @Request() req,
  ) {
    // Implementation would fetch specific conversation
    return { conversation: null };
  }

  @Get('analytics/summary')
  @UseGuards(AuthGuard('jwt'))
  async getAnalyticsSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getAnalyticsSummary(start, end, req.user?.ownerId);
  }

  @Get('analytics/performance')
  @UseGuards(AuthGuard('jwt'))
  async getPerformanceMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getPerformanceMetrics(start, end, req.user?.ownerId);
  }

  @Post('feedback/:conversationId')
  async submitFeedback(
    @Param('conversationId') conversationId: string,
    @Body() feedback: { rating: number; comment?: string },
  ) {
    // Implementation would save user feedback
    return { success: true };
  }
}
