import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Goal } from './goal.entity';

export enum GoalCategory {
  EMERGENCY_FUND = 'emergency_fund',
  RETIREMENT = 'retirement',
  VACATION = 'vacation',
  EDUCATION = 'education',
  HOME = 'home',
  VEHICLE = 'vehicle',
  WEDDING = 'wedding',
  BUSINESS = 'business',
  DEBT_PAYOFF = 'debt_payoff',
  OTHER = 'other',
}

@Entity('goal_templates')
export class GoalTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: GoalCategory,
    default: GoalCategory.OTHER,
  })
  category: GoalCategory;

  /** Suggested target amount in minor currency units (e.g. kobo / cents) */
  @Column({ type: 'bigint', nullable: true })
  defaultTargetAmount: number | null;

  /** Suggested duration in days */
  @Column({ type: 'int', nullable: true })
  defaultDurationDays: number | null;

  /** Icon identifier (maps to a frontend icon set) */
  @Column({ length: 50, nullable: true })
  iconKey: string | null;

  /** Free-form tips shown to the user when they pick this template */
  @Column({ type: 'simple-array', nullable: true })
  tips: string[] | null;

  @Column({ default: true })
  isActive: boolean;

  /** How many goals have been created from this template */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @OneToMany(() => Goal, (goal) => goal.template)
  goals: Goal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
