import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { ChatbotMessage } from './entities/chatbot-message.entity';
import { ChatbotTrainingData } from './entities/chatbot-training-data.entity';
import { ChatbotAnalytics } from './entities/chatbot-analytics.entity';

// Services
import { NLPService } from './services/nlp.service';
import { ConversationFlowService } from './services/conversation-flow.service';
import { RefundProcessingService } from './services/refund-processing.service';
import { EventLookupService } from './services/event-lookup.service';
import { EscalationService } from './services/escalation.service';
import { ChatAnalyticsService } from './services/chat-analytics.service';

// Controllers
import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotAdminController } from './controllers/chatbot-admin.controller';

// External modules
import { UserModule } from '../user/user.module';
import { TicketModule } from '../ticket/ticket.module';
import { EventsModule } from '../events/events.module';
import { RefundsModule } from '../refunds/refunds.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatbotConversation,
      ChatbotMessage,
      ChatbotTrainingData,
      ChatbotAnalytics,
    ]),
    HttpModule,
    UserModule,
    TicketModule,
    EventsModule,
    RefundsModule,
  ],
  providers: [
    NLPService,
    ConversationFlowService,
    RefundProcessingService,
    EventLookupService,
    EscalationService,
    ChatAnalyticsService,
  ],
  controllers: [
    ChatbotController,
    ChatbotAdminController,
  ],
  exports: [
    NLPService,
    ConversationFlowService,
    ChatAnalyticsService,
  ],
})
export class IntelligentChatbotModule {}
