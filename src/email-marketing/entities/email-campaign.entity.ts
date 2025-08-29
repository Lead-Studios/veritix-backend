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
import { Event } from '../../events/entities/event.entity';
import { EmailTemplate } from './email-template.entity';
import { CampaignSegment } from './campaign-segment.entity';
import { EmailDelivery } from './email-delivery.entity';
import { ABTest } from './ab-test.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum CampaignType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  DRIP_SEQUENCE = 'drip_sequence',
  AUTOMATION = 'automation',
  AB_TEST = 'ab_test',
}

export enum SendTimeOptimization {
  IMMEDIATE = 'immediate',
  OPTIMAL_TIME = 'optimal_time',
  TIMEZONE_BASED = 'timezone_based',
  CUSTOM_SCHEDULE = 'custom_schedule',
}

@Entity('email_campaigns')
@Index(['status', 'scheduledAt'])
@Index(['campaignType', 'createdBy'])
@Index(['eventId'])
export class EmailCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  campaignType: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ type: 'uuid' })
  @Index()
  templateId: string;

  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'varchar', length: 300 })
  subject: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  preheader: string;

  @Column({ type: 'varchar', length: 200 })
  fromName: string;

  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  replyToEmail: string;

  @Column({
    type: 'enum',
    enum: SendTimeOptimization,
    default: SendTimeOptimization.IMMEDIATE,
  })
  sendTimeOptimization: SendTimeOptimization;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ type: 'int', default: 0 })
  openedCount: number;

  @Column({ type: 'int', default: 0 })
  clickedCount: number;

  @Column({ type: 'int', default: 0 })
  unsubscribedCount: number;

  @Column({ type: 'int', default: 0 })
  bouncedCount: number;

  @Column({ type: 'int', default: 0 })
  complainedCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  openRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  unsubscribeRate: number;

  @Column({ type: 'json', nullable: true })
  segmentationRules: {
    includeSegments?: string[];
    excludeSegments?: string[];
    customRules?: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
    }[];
    audienceSize?: number;
  };

  @Column({ type: 'json', nullable: true })
  personalization: {
    variables: Record<string, any>;
    dynamicContent: {
      rules: {
        condition: string;
        content: string;
      }[];
    };
  };

  @Column({ type: 'json', nullable: true })
  trackingSettings: {
    trackOpens: boolean;
    trackClicks: boolean;
    trackUnsubscribes: boolean;
    googleAnalytics?: {
      enabled: boolean;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    };
    customTracking?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  deliverySettings: {
    throttleRate?: number; // emails per hour
    retryAttempts?: number;
    suppressionLists?: string[];
    testEmailAddresses?: string[];
  };

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    budget?: number;
    expectedROI?: number;
    campaignGoals?: string[];
    notes?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => EmailTemplate)
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;

  @OneToMany(() => CampaignSegment, (segment) => segment.campaign)
  segments: CampaignSegment[];

  @OneToMany(() => EmailDelivery, (delivery) => delivery.campaign)
  deliveries: EmailDelivery[];

  @OneToMany(() => ABTest, (test) => test.campaign)
  abTests: ABTest[];
}
