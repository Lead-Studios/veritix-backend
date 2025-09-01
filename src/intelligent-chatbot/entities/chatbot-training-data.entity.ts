import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TrainingDataType {
  INTENT = 'intent',
  ENTITY = 'entity',
  RESPONSE = 'response',
  FAQ = 'faq',
  WORKFLOW = 'workflow',
}

export enum TrainingDataStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
@Index(['type', 'status'])
@Index(['intent'])
@Index(['language'])
export class ChatbotTrainingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TrainingDataType,
  })
  type: TrainingDataType;

  @Column()
  intent: string;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text' })
  expectedOutput: string;

  @Column({ type: 'json', nullable: true })
  entities: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>;

  @Column({ default: 'en' })
  language: string;

  @Column({
    type: 'enum',
    enum: TrainingDataStatus,
    default: TrainingDataStatus.ACTIVE,
  })
  status: TrainingDataStatus;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'float', default: 0 })
  successRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  organizerId: string;
}
