import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailDelivery } from './email-delivery.entity';

export enum BounceType {
  HARD = 'hard',
  SOFT = 'soft',
  COMPLAINT = 'complaint',
  SUPPRESSION = 'suppression',
}

export enum BounceSubType {
  // Hard bounce subtypes
  GENERAL = 'general',
  NO_EMAIL = 'no_email',
  SUPPRESSED = 'suppressed',
  MAILBOX_FULL = 'mailbox_full',
  MESSAGE_TOO_LARGE = 'message_too_large',
  CONTENT_REJECTED = 'content_rejected',
  ATTACHMENT_REJECTED = 'attachment_rejected',
  
  // Soft bounce subtypes
  GENERAL_SOFT = 'general_soft',
  MAILBOX_FULL_SOFT = 'mailbox_full_soft',
  MESSAGE_TOO_LARGE_SOFT = 'message_too_large_soft',
  CONTENT_REJECTED_SOFT = 'content_rejected_soft',
  
  // Complaint subtypes
  ABUSE = 'abuse',
  AUTH_FAILURE = 'auth_failure',
  FRAUD = 'fraud',
  NOT_SPAM = 'not_spam',
  OTHER = 'other',
  VIRUS = 'virus',
}

@Entity('email_bounces')
@Index(['deliveryId', 'bouncedAt'])
@Index(['bounceType', 'bouncedAt'])
@Index(['recipientEmail', 'bounceType'])
export class EmailBounce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  deliveryId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: BounceType,
  })
  @Index()
  bounceType: BounceType;

  @Column({
    type: 'enum',
    enum: BounceSubType,
    nullable: true,
  })
  bounceSubType: BounceSubType;

  @Column({ type: 'timestamp' })
  @Index()
  bouncedAt: Date;

  @Column({ type: 'text', nullable: true })
  diagnosticCode: string;

  @Column({ type: 'text', nullable: true })
  bounceMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  remoteMtaIp: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reportingMta: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  action: string; // failed, delayed, delivered, relayed, expanded

  @Column({ type: 'varchar', length: 100, nullable: true })
  status: string; // SMTP status code (e.g., 5.1.1)

  @Column({ type: 'boolean', default: false })
  isPermanent: boolean;

  @Column({ type: 'boolean', default: false })
  suppressRecipient: boolean; // Whether to suppress future emails to this recipient

  @Column({ type: 'json', nullable: true })
  rawBounceData: {
    messageId?: string;
    timestamp?: string;
    source?: string;
    destination?: string[];
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{
      emailAddress: string;
      action: string;
      status: string;
      diagnosticCode: string;
    }>;
    complainedRecipients?: Array<{
      emailAddress: string;
      complaintFeedbackType: string;
      complaintSubType: string;
      userAgent: string;
      arrivalDate: string;
    }>;
    deliveryDelay?: {
      delayType: string;
      expirationTime: string;
      delayedRecipients: Array<{
        emailAddress: string;
        action: string;
        status: string;
        diagnosticCode: string;
      }>;
    };
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    provider?: string; // SES, SendGrid, Mailgun, etc.
    messageTag?: string;
    campaignId?: string;
    listId?: string;
    suppressionReason?: string;
    feedbackId?: string;
    userAgent?: string;
    arrivalDate?: string;
  };

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EmailDelivery, (delivery) => delivery.bounces)
  @JoinColumn({ name: 'deliveryId' })
  delivery: EmailDelivery;
}
