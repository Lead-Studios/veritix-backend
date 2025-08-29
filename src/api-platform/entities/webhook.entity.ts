import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WebhookDelivery } from './webhook-delivery.entity';

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  PAUSED = 'paused',
}

export enum WebhookEvent {
  // Event management
  EVENT_CREATED = 'event.created',
  EVENT_UPDATED = 'event.updated',
  EVENT_DELETED = 'event.deleted',
  EVENT_PUBLISHED = 'event.published',
  
  // Ticket management
  TICKET_PURCHASED = 'ticket.purchased',
  TICKET_CANCELLED = 'ticket.cancelled',
  TICKET_REFUNDED = 'ticket.refunded',
  TICKET_TRANSFERRED = 'ticket.transferred',
  
  // Payment events
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // User events
  USER_REGISTERED = 'user.registered',
  USER_UPDATED = 'user.updated',
  
  // Custom events
  CUSTOM = 'custom',
}

@Entity()
@Index(['tenantId', 'status'])
@Index(['events'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  url: string;

  @Column({ type: 'json' })
  events: WebhookEvent[];

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  status: WebhookStatus;

  @Column({ nullable: true })
  secret: string; // For signature verification

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ default: 30000 })
  timeoutMs: number;

  @Column({ default: false })
  verifySSL: boolean;

  @Column({ type: 'json', nullable: true })
  filters: Record<string, any>; // Event filtering conditions

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  apiKeyId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => WebhookDelivery, (delivery) => delivery.webhook)
  deliveries: WebhookDelivery[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
