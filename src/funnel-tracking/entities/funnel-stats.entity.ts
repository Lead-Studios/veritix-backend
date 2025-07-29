import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FunnelStage } from './funnel-action.entity';

@Entity('funnel_stats')
@Index(['eventId', 'date'])
@Index(['stage', 'date'])
export class FunnelStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({
    type: 'enum',
    enum: FunnelStage,
  })
  @Index()
  stage: FunnelStage;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({ type: 'int', default: 0 })
  totalSessions: number;

  @Column({ type: 'int', default: 0 })
  totalActions: number;

  @Column({ type: 'int', default: 0 })
  uniqueUsers: number;

  @Column({ type: 'int', default: 0 })
  conversions: number; // sessions that reached this stage

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number; // percentage of sessions that reached this stage

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  dropoffRate: number; // percentage of sessions that dropped off at this stage

  @Column({ type: 'int', default: 0 })
  avgTimeSpent: number; // average seconds spent at this stage

  @Column({ type: 'int', default: 0 })
  totalTimeSpent: number; // total seconds spent at this stage

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number; // total revenue from sessions that reached this stage

  @Column({ type: 'jsonb', nullable: true })
  trafficSourceBreakdown: Record<string, number>; // breakdown by traffic source

  @Column({ type: 'jsonb', nullable: true })
  deviceBreakdown: Record<string, number>; // breakdown by device type

  @Column({ type: 'jsonb', nullable: true })
  countryBreakdown: Record<string, number>; // breakdown by country

  @Column({ type: 'jsonb', nullable: true })
  utmBreakdown: Record<string, number>; // breakdown by UTM parameters

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
