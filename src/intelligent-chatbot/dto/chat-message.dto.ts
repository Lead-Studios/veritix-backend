import { IsString, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { MessageIntent } from '../entities/chatbot-message.entity';

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ChatResponseDto {
  message: string;
  conversationId: string;
  messageId: string;
  intent?: MessageIntent;
  confidence?: number;
  quickReplies?: string[];
  actions?: string[];
  requiresEscalation?: boolean;
  conversationEnded?: boolean;
  processingTime?: number;
}

export class StartConversationDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  userProfile?: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
