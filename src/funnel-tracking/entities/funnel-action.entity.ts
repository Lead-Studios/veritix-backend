import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FunnelSession } from './funnel-session.entity';

export enum FunnelStage {
  EVENT_VIEW = 'event_view',
  TICKET_SELECTION = 'ticket_selection',
  CART_ADD = 'cart_add',
  CHECKOUT_START = 'checkout_start',
  PAYMENT_INFO = 'payment_info',
  PAYMENT_COMPLETE = 'payment_complete',
  PURCHASE_COMPLETE = 'purchase_complete',
}

export enum FunnelActionType {
  VIEW = 'view',
  CLICK = 'click',
  FORM_START = 'form_start',
  FORM_COMPLETE = 'form_complete',
  ERROR = 'error',
  ABANDON = 'abandon',
}

@Entity('funnel_actions')
@Index(['sessionId', 'createdAt'])
@Index(['eventId', 'stage', 'createdAt'])
@Index(['userId', 'createdAt'])
export class FunnelAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  sessionId: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string; // null for anonymous users

  @Column({
    type: 'enum',
    enum: FunnelStage,
  })
  @Index()
  stage: FunnelStage;

  @Column({
    type: 'enum',
    enum: FunnelActionType,
  })
  @Index()
  actionType: FunnelActionType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionName: string; // e.g., 'view_ticket_tier', 'click_buy_button'

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional context like ticket tier, price, etc.

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trafficSource: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referrerUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmSource: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmMedium: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmCampaign: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmTerm: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmContent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  operatingSystem: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'int', nullable: true })
  timeOnPage: number; // seconds spent on this stage

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // if actionType is ERROR

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @ManyToOne(() => FunnelSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: FunnelSession;
} 