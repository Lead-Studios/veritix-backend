import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatbotMessage } from './chatbot-message.entity';

export enum ConversationStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  ABANDONED = 'abandoned',
}

export enum ConversationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity()
@Index(['userId', 'status'])
@Index(['createdAt'])
@Index(['priority', 'status'])
export class ChatbotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({
    type: 'enum',
    enum: ConversationPriority,
    default: ConversationPriority.MEDIUM,
  })
  priority: ConversationPriority;

  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  category: string; // tickets, refunds, events, general

  @Column({ nullable: true })
  language: string;

  @Column({ default: false })
  isEscalated: boolean;

  @Column({ nullable: true })
  escalatedTo: string; // Agent ID

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt: Date;

  @Column({ nullable: true })
  escalationReason: string;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>; // Event ID, ticket ID, etc.

  @Column({ type: 'json', nullable: true })
  userProfile: Record<string, any>; // User preferences, history

  @Column({ type: 'float', default: 0 })
  satisfactionScore: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string; // bot, agent, user

  @Column({ type: 'text', nullable: true })
  resolutionSummary: string;

  @Column({ type: 'int', default: 0 })
  messageCount: number;

  @Column({ type: 'int', default: 0 })
  botResponseTime: number; // Average response time in ms

  @ManyToOne(() => User, (user) => user.id, { nullable: true })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @OneToMany(() => ChatbotMessage, (message) => message.conversation)
  messages: ChatbotMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
