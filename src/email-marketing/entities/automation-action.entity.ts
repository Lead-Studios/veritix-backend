import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutomationWorkflow } from './automation-workflow.entity';
import { EmailTemplate } from './email-template.entity';

export enum ActionType {
  SEND_EMAIL = 'send_email',
  WAIT = 'wait',
  ADD_TO_SEGMENT = 'add_to_segment',
  REMOVE_FROM_SEGMENT = 'remove_from_segment',
  UPDATE_USER_PROPERTY = 'update_user_property',
  SEND_WEBHOOK = 'send_webhook',
  CREATE_TASK = 'create_task',
  CONDITIONAL_SPLIT = 'conditional_split',
  GOAL_CHECK = 'goal_check',
  END_WORKFLOW = 'end_workflow',
}

@Entity('automation_actions')
@Index(['workflowId', 'sortOrder'])
export class AutomationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowId: string;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'json' })
  configuration: {
    // Email action
    templateId?: string;
    subject?: string;
    fromName?: string;
    fromEmail?: string;
    personalization?: Record<string, any>;
    
    // Wait action
    delay?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
    waitUntil?: {
      type: 'specific_time' | 'day_of_week' | 'optimal_time';
      time?: string;
      dayOfWeek?: number;
    };
    
    // Segment actions
    segmentId?: string;
    
    // Property update
    propertyUpdates?: {
      field: string;
      value: any;
      operation: 'set' | 'increment' | 'decrement' | 'append';
    }[];
    
    // Webhook action
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT';
    webhookHeaders?: Record<string, string>;
    webhookPayload?: Record<string, any>;
    
    // Conditional split
    conditions?: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
    trueActionId?: string;
    falseActionId?: string;
    
    // Goal check
    goalType?: string;
    goalValue?: any;
    
    // Custom configuration
    customConfig?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  conditions: {
    executeIf?: {
      field: string;
      operator: string;
      value: any;
    }[];
    skipIf?: {
      field: string;
      operator: string;
      value: any;
    }[];
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AutomationWorkflow, (workflow) => workflow.actions)
  @JoinColumn({ name: 'workflowId' })
  workflow: AutomationWorkflow;

  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;
}
