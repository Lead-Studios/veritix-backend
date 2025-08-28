import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollOption } from './poll-option.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Unique(['pollId', 'userId', 'optionId'])
export class PollVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  textResponse: string;

  @Column({ type: 'int', nullable: true })
  ratingValue: number;

  @Column({ default: false })
  isAnonymous: boolean;

  @ManyToOne(() => Poll, (poll) => poll.votes, { onDelete: 'CASCADE' })
  poll: Poll;

  @Column()
  pollId: string;

  @ManyToOne(() => PollOption, (option) => option.votes, { onDelete: 'CASCADE', nullable: true })
  option: PollOption;

  @Column({ nullable: true })
  optionId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
