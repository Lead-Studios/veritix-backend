import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TemplateComponent } from './template-component.entity';
import { EmailCampaign } from './email-campaign.entity';

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum TemplateType {
  EVENT_ANNOUNCEMENT = 'event_announcement',
  TICKET_REMINDER = 'ticket_reminder',
  WELCOME_SERIES = 'welcome_series',
  ABANDONED_CART = 'abandoned_cart',
  POST_EVENT = 'post_event',
  PROMOTIONAL = 'promotional',
  NEWSLETTER = 'newsletter',
  CUSTOM = 'custom',
}

export enum TemplateCategory {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  AUTOMATION = 'automation',
}

@Entity('email_templates')
@Index(['status', 'isActive'])
@Index(['templateType', 'category'])
@Index(['createdBy'])
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  @Index()
  slug: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
  })
  templateType: TemplateType;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
  })
  category: TemplateCategory;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus;

  @Column({ type: 'varchar', length: 300 })
  subject: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  preheader: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent: string;

  @Column({ type: 'json' })
  designData: {
    components: any[];
    styles: Record<string, any>;
    layout: {
      width: number;
      backgroundColor: string;
      fontFamily: string;
    };
    variables: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  variables: {
    name: string;
    type: 'text' | 'image' | 'url' | 'date' | 'number';
    defaultValue?: any;
    required: boolean;
    description?: string;
  }[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', default: false })
  isShared: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    industry?: string;
    eventTypes?: string[];
    targetAudience?: string;
    estimatedReadTime?: number;
    lastTestDate?: Date;
    testResults?: {
      openRate?: number;
      clickRate?: number;
      conversionRate?: number;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => TemplateComponent, (component) => component.template)
  components: TemplateComponent[];

  @OneToMany(() => EmailCampaign, (campaign) => campaign.template)
  campaigns: EmailCampaign[];
}
