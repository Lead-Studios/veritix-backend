import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../user/entities/user.entity';
import { QuestionVote } from './question-vote.entity';

export enum QuestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ANSWERED = 'answered',
}

export enum QuestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity()
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: QuestionStatus, default: QuestionStatus.PENDING })
  status: QuestionStatus;

  @Column({ type: 'enum', enum: QuestionPriority, default: QuestionPriority.MEDIUM })
  priority: QuestionPriority;

  @Column({ type: 'text', nullable: true })
  answer: string;

  @Column({ nullable: true })
  answeredBy: string;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt: Date;

  @Column({ type: 'text', nullable: true })
  moderationNote: string;

  @Column({ nullable: true })
  moderatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isHighlighted: boolean;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @ManyToOne(() => Event, (event) => event.id, { onDelete: 'CASCADE' })
  event: Event;

  @Column()
  eventId: string;

  @ManyToOne(() => User, (user) => user.id, { nullable: true })
  submittedBy: User;

  @Column({ nullable: true })
  submittedById: string;

  @OneToMany(() => QuestionVote, (vote) => vote.question)
  votes: QuestionVote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ nullable: true })
  ownerId: string;
}
