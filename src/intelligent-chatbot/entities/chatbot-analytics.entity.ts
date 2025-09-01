import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsMetricType {
  CONVERSATION_COUNT = 'conversation_count',
  MESSAGE_COUNT = 'message_count',
  RESOLUTION_RATE = 'resolution_rate',
  ESCALATION_RATE = 'escalation_rate',
  RESPONSE_TIME = 'response_time',
  USER_SATISFACTION = 'user_satisfaction',
  INTENT_ACCURACY = 'intent_accuracy',
  POPULAR_INTENTS = 'popular_intents',
}

@Entity()
@Index(['metricType', 'date'])
@Index(['conversationId'])
export class ChatbotAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalyticsMetricType,
  })
  metricType: AnalyticsMetricType;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  conversationId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  intent: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
