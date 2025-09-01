import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ChatbotConversation } from './chatbot-conversation.entity';

export enum MessageType {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
  ESCALATION = 'escalation',
}

export enum MessageIntent {
  GREETING = 'greeting',
  TICKET_INQUIRY = 'ticket_inquiry',
  REFUND_REQUEST = 'refund_request',
  EVENT_INFO = 'event_info',
  EXCHANGE_REQUEST = 'exchange_request',
  COMPLAINT = 'complaint',
  GENERAL_QUESTION = 'general_question',
  ESCALATION_REQUEST = 'escalation_request',
  GOODBYE = 'goodbye',
  UNKNOWN = 'unknown',
}

@Entity()
@Index(['conversationId', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['intent'])
export class ChatbotMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageIntent,
    nullable: true,
  })
  intent: MessageIntent;

  @Column({ type: 'float', nullable: true })
  confidence: number; // NLP confidence score

  @Column({ type: 'json', nullable: true })
  entities: Record<string, any>; // Extracted entities (dates, amounts, etc.)

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // Additional context

  @Column({ type: 'json', nullable: true })
  attachments: string[]; // File URLs or IDs

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ type: 'int', nullable: true })
  processingTime: number; // Time taken to process in ms

  @Column({ nullable: true })
  modelUsed: string; // AI model used for response

  @Column({ type: 'json', nullable: true })
  actions: Record<string, any>[]; // Actions taken (refund, escalation, etc.)

  @Column({ default: false })
  requiresHumanReview: boolean;

  @Column({ type: 'text', nullable: true })
  originalLanguage: string;

  @Column({ type: 'text', nullable: true })
  translatedContent: string;

  @Column({ type: 'float', nullable: true })
  sentimentScore: number; // -1 to 1, negative to positive

  @Column({ type: 'json', nullable: true })
  quickReplies: string[]; // Suggested quick replies

  @ManyToOne(() => ChatbotConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: ChatbotConversation;

  @Column()
  conversationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
