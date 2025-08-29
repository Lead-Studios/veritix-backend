import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Webhook } from './webhook.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Entity()
@Index(['webhookId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: string;

  @Column()
  eventId: string; // ID of the event that triggered this delivery

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ nullable: true })
  httpStatus: number;

  @Column({ type: 'bigint', nullable: true })
  responseTime: number; // in milliseconds

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'json', nullable: true })
  requestHeaders: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  responseHeaders: Record<string, string>;

  @Column({ nullable: true })
  signature: string; // HMAC signature for verification

  @ManyToOne(() => Webhook, (webhook) => webhook.deliveries, { onDelete: 'CASCADE' })
  webhook: Webhook;

  @Column()
  webhookId: string;

  @CreateDateColumn()
  createdAt: Date;
}
