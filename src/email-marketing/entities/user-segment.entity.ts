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
import { SegmentRule } from './segment-rule.entity';
import { CampaignSegment } from './campaign-segment.entity';

export enum SegmentType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  BEHAVIORAL = 'behavioral',
  DEMOGRAPHIC = 'demographic',
  ENGAGEMENT = 'engagement',
  CUSTOM = 'custom',
}

export enum SegmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CALCULATING = 'calculating',
  ERROR = 'error',
}

@Entity('user_segments')
@Index(['segmentType', 'status'])
@Index(['createdBy'])
export class UserSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SegmentType,
  })
  segmentType: SegmentType;

  @Column({
    type: 'enum',
    enum: SegmentStatus,
    default: SegmentStatus.ACTIVE,
  })
  status: SegmentStatus;

  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  @Column({ type: 'int', default: 0 })
  userCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;

  @Column({ type: 'json' })
  criteria: {
    conditions: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'exists' | 'not_exists';
      value: any;
      dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
    }[];
    logic: 'AND' | 'OR';
    groups?: {
      conditions: any[];
      logic: 'AND' | 'OR';
    }[];
  };

  @Column({ type: 'json', nullable: true })
  behaviorCriteria: {
    eventActions?: {
      action: 'purchased_ticket' | 'viewed_event' | 'abandoned_cart' | 'shared_event' | 'left_review';
      eventType?: string;
      timeframe?: {
        value: number;
        unit: 'days' | 'weeks' | 'months';
      };
      frequency?: {
        operator: 'exactly' | 'at_least' | 'at_most';
        count: number;
      };
    }[];
    engagementLevel?: {
      emailOpens?: { min?: number; max?: number; timeframe: string };
      emailClicks?: { min?: number; max?: number; timeframe: string };
      websiteVisits?: { min?: number; max?: number; timeframe: string };
    };
  };

  @Column({ type: 'json', nullable: true })
  demographicCriteria: {
    age?: { min?: number; max?: number };
    location?: {
      countries?: string[];
      states?: string[];
      cities?: string[];
      radius?: { lat: number; lng: number; miles: number };
    };
    interests?: string[];
    eventPreferences?: string[];
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    refreshFrequency?: 'real_time' | 'hourly' | 'daily' | 'weekly';
    estimatedGrowthRate?: number;
    averageEngagement?: number;
    topInterests?: string[];
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

  @OneToMany(() => SegmentRule, (rule) => rule.segment)
  rules: SegmentRule[];

  @OneToMany(() => CampaignSegment, (campaignSegment) => campaignSegment.segment)
  campaignSegments: CampaignSegment[];
}
