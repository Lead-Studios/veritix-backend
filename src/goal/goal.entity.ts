/**
 * Augmented Goal entity — adds template linkage and public-visibility flag.
 *
 * IMPORTANT: This file is meant to EXTEND / REPLACE the existing goal.entity.ts
 * in the NexaFx codebase.  Only the new / modified fields are highlighted with
 * "NEW" comments so a reviewer can diff them against the original easily.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GoalTemplate } from './goal-template.entity';

export enum GoalStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Target amount in minor currency units */
  @Column({ type: 'bigint' })
  targetAmount: number;

  /** Amount saved so far */
  @Column({ type: 'bigint', default: 0 })
  savedAmount: number;

  @Column({ type: 'date', nullable: true })
  targetDate: string | null;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.IN_PROGRESS,
  })
  status: GoalStatus;

  // ── NEW: template linkage ────────────────────────────────────────────────

  /** [NEW] Template this goal was created from (optional) */
  @ManyToOne(() => GoalTemplate, (t) => t.goals, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'templateId' })
  template: GoalTemplate | null;

  @Column({ nullable: true })
  templateId: string | null;

  // ── NEW: social / marketplace fields ────────────────────────────────────

  /**
   * [NEW] When true the goal appears in GET /goals/public.
   * The owner's real name is NEVER exposed — only displayName is used.
   */
  @Column({ default: false })
  isPublic: boolean;

  /**
   * [NEW] Anonymised display name shown on public listings & leaderboards.
   * Defaults to the user's chosen display name at join time; can be overridden.
   */
  @Column({ length: 60, nullable: true })
  displayName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Computed helper ──────────────────────────────────────────────────────

  get progressPercent(): number {
    if (!this.targetAmount || this.targetAmount === 0) return 0;
    return Math.min(
      100,
      Math.round((Number(this.savedAmount) / Number(this.targetAmount)) * 100),
    );
  }
}
