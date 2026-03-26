import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChallengeParticipation } from './challenge-participation.entity';

export enum ChallengeStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('community_challenges')
export class CommunityChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Optional banner image URL */
  @Column({ nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  /**
   * Minimum personal target (in minor units) a goal must have
   * to be eligible for joining this challenge.
   */
  @Column({ type: 'bigint', nullable: true })
  minTargetAmount: number | null;

  /** Maximum number of participants allowed (null = unlimited) */
  @Column({ type: 'int', nullable: true })
  maxParticipants: number | null;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.UPCOMING,
  })
  status: ChallengeStatus;

  /** Prize / badge label for top finishers */
  @Column({ length: 100, nullable: true })
  prizeDescription: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ChallengeParticipation, (cp) => cp.challenge, {
    cascade: true,
  })
  participations: ChallengeParticipation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
