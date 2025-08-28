import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollVote } from './poll-vote.entity';

@Entity()
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: 0 })
  voteCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  poll: Poll;

  @Column()
  pollId: string;

  @OneToMany(() => PollVote, (vote) => vote.option)
  votes: PollVote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
