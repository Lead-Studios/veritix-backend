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
import { EmailCampaign } from './email-campaign.entity';
import { EmailOpen } from './email-open.entity';
import { EmailClick } from './email-click.entity';

export enum DeliveryStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  DEFERRED = 'deferred',
  DROPPED = 'dropped',
}

export enum BounceType {
  HARD = 'hard',
  SOFT = 'soft',
  BLOCK = 'block',
  SPAM = 'spam',
}

@Entity('email_deliveries')
@Index(['campaignId', 'status'])
@Index(['recipientId', 'campaignId'])
@Index(['status', 'sentAt'])
export class EmailDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  campaignId: string;

  @Column({ type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.QUEUED,
  })
  status: DeliveryStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  messageId: string;

  @Column({ type: 'varchar', length: 300 })
  subject: string;

  @Column({ type: 'varchar', length: 200 })
  fromName: string;

  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  bouncedAt: Date;

  @Column({
    type: 'enum',
    enum: BounceType,
    nullable: true,
  })
  bounceType: BounceType;

  @Column({ type: 'text', nullable: true })
  bounceReason: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'json', nullable: true })
  personalizationData: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  trackingData: {
    openTrackingEnabled: boolean;
    clickTrackingEnabled: boolean;
    unsubscribeTrackingEnabled: boolean;
    customTrackingParams?: Record<string, any>;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  testVariantId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    timezone?: string;
    deviceType?: string;
    emailClient?: string;
    operatingSystem?: string;
    tags?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailCampaign, (campaign) => campaign.deliveries)
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @OneToMany(() => EmailOpen, (open) => open.delivery)
  opens: EmailOpen[];

  @OneToMany(() => EmailClick, (click) => click.delivery)
  clicks: EmailClick[];
}
