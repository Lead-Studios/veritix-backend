import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AutomationTrigger } from './automation-trigger.entity';
import { AutomationAction } from './automation-action.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum WorkflowType {
  WELCOME_SERIES = 'welcome_series',
  ABANDONED_CART = 'abandoned_cart',
  POST_PURCHASE = 'post_purchase',
  RE_ENGAGEMENT = 're_engagement',
  EVENT_REMINDER = 'event_reminder',
  BIRTHDAY = 'birthday',
  CUSTOM = 'custom',
}

@Entity('automation_workflows')
@Index(['status', 'workflowType'])
@Index(['createdBy'])
export class AutomationWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowType,
  })
  workflowType: WorkflowType;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  totalEntered: number;

  @Column({ type: 'int', default: 0 })
  totalCompleted: number;

  @Column({ type: 'int', default: 0 })
  currentlyActive: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'json', nullable: true })
  settings: {
    allowReentry?: boolean;
    exitOnGoalAchievement?: boolean;
    maxDuration?: {
      value: number;
      unit: 'days' | 'weeks' | 'months';
    };
    timezone?: string;
    sendingLimits?: {
      maxEmailsPerDay?: number;
      respectUnsubscribes?: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  goals: {
    primary?: {
      type: 'email_open' | 'email_click' | 'purchase' | 'event_registration' | 'custom';
      target?: number;
      timeframe?: string;
    };
    secondary?: {
      type: string;
      target?: number;
      timeframe?: string;
    }[];
  };

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    estimatedDuration?: string;
    targetAudience?: string;
    expectedResults?: string;
    notes?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => AutomationTrigger, (trigger) => trigger.workflow)
  triggers: AutomationTrigger[];

  @OneToMany(() => AutomationAction, (action) => action.workflow)
  actions: AutomationAction[];
}
