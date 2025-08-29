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

export enum TriggerType {
  USER_REGISTERED = 'user_registered',
  TICKET_PURCHASED = 'ticket_purchased',
  EVENT_VIEWED = 'event_viewed',
  CART_ABANDONED = 'cart_abandoned',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  EVENT_ATTENDED = 'event_attended',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  INACTIVITY = 'inactivity',
  SEGMENT_ENTERED = 'segment_entered',
  SEGMENT_EXITED = 'segment_exited',
  CUSTOM_EVENT = 'custom_event',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
}

@Entity('automation_triggers')
@Index(['workflowId', 'triggerType'])
export class AutomationTrigger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowId: string;

  @Column({
    type: 'enum',
    enum: TriggerType,
  })
  triggerType: TriggerType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'json' })
  conditions: {
    // Event-based conditions
    eventType?: string;
    eventProperties?: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
    
    // Time-based conditions
    timeDelay?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
    
    // Schedule-based conditions
    schedule?: {
      type: 'once' | 'recurring';
      datetime?: Date;
      frequency?: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time?: string;
    };
    
    // Segment conditions
    segmentId?: string;
    
    // Custom conditions
    customConditions?: {
      field: string;
      operator: string;
      value: any;
    }[];
  };

  @Column({ type: 'json', nullable: true })
  filters: {
    userSegments?: string[];
    excludeSegments?: string[];
    userProperties?: {
      field: string;
      operator: string;
      value: any;
    }[];
    timeWindow?: {
      start: string;
      end: string;
      timezone?: string;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AutomationWorkflow, (workflow) => workflow.triggers)
  @JoinColumn({ name: 'workflowId' })
  workflow: AutomationWorkflow;
}
