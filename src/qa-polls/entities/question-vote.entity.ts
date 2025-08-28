import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Question } from './question.entity';
import { User } from '../../user/entities/user.entity';

export enum VoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
}

@Entity()
@Unique(['questionId', 'userId'])
export class QuestionVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VoteType })
  type: VoteType;

  @ManyToOne(() => Question, (question) => question.votes, { onDelete: 'CASCADE' })
  question: Question;

  @Column()
  questionId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
