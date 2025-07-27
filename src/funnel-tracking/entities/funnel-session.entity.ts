import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FunnelAction } from './funnel-action.entity';

export enum FunnelSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  EXPIRED = 'expired',
}

@Entity('funnel_sessions')
@Index(['eventId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class FunnelSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string; // null for anonymous users

  @Column({
    type: 'enum',
    enum: FunnelSessionStatus,
    default: FunnelSessionStatus.ACTIVE,
  })
  @Index()
  status: FunnelSessionStatus;

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

  @Column({ type: 'int', default: 0 })
  totalActions: number;

  @Column({ type: 'int', default: 0 })
  totalTimeSpent: number; // total seconds spent in funnel

  @Column({ type: 'uuid', nullable: true })
  purchaseId: string; // links to final purchase if completed

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalSpent: number; // total amount spent if completed

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  abandonedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => FunnelAction, (action) => action.session)
  actions: FunnelAction[];
} 