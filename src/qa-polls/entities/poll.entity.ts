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

export enum PollStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum PollType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING = 'rating',
  TEXT = 'text',
}

@Entity()
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PollType, default: PollType.SINGLE_CHOICE })
  type: PollType;

  @Column({ type: 'enum', enum: PollStatus, default: PollStatus.PENDING })
  status: PollStatus;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date;

  @Column({ default: false })
  allowAnonymousVoting: boolean;

  @Column({ default: false })
  allowMultipleVotes: boolean;

  @Column({ default: true })
  showResults: boolean;

  @Column({ default: false })
  showResultsAfterVoting: boolean;

  @Column({ default: 0 })
  maxChoices: number;

  @Column({ default: 0 })
  totalVotes: number;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'text', nullable: true })
  moderationNote: string;

  @Column({ nullable: true })
  moderatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  @ManyToOne(() => Event, (event) => event.id, { onDelete: 'CASCADE' })
  event: Event;

  @Column()
  eventId: string;

  @ManyToOne(() => User, (user) => user.id, { nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @OneToMany('PollOption', 'poll', { cascade: true })
  options: any[];

  @OneToMany('PollVote', 'poll')
  votes: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ nullable: true })
  ownerId: string;
}
