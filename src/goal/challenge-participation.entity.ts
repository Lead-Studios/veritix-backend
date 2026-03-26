import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CommunityChallenge } from './community-challenge.entity';
import { Goal } from './goal.entity';
import { User } from '../../users/entities/user.entity';

@Entity('challenge_participations')
@Unique(['challenge', 'user'])
export class ChallengeParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CommunityChallenge, (c) => c.participations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'challengeId' })
  challenge: CommunityChallenge;

  @Column()
  challengeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  /**
   * The specific personal goal the user linked to this challenge.
   * A user may have multiple goals; they pick one per challenge.
   */
  @ManyToOne(() => Goal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: Goal;

  @Column()
  goalId: string;

  @CreateDateColumn()
  joinedAt: Date;
}
