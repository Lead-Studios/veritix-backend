import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from 'src/event/entities/event.entity';

export enum AnalyticsPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('waitlist_analytics')
@Index(['eventId', 'period', 'periodStart'])
@Index(['period', 'periodStart'])
export class WaitlistAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @Column({
    type: 'enum',
    enum: AnalyticsPeriod,
  })
  period: AnalyticsPeriod;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  // Waitlist metrics
  @Column({ type: 'int', default: 0 })
  totalJoined: number;

  @Column({ type: 'int', default: 0 })
  totalLeft: number;

  @Column({ type: 'int', default: 0 })
  totalNotified: number;

  @Column({ type: 'int', default: 0 })
  totalConverted: number;

  @Column({ type: 'int', default: 0 })
  totalExpired: number;

  @Column({ type: 'int', default: 0 })
  peakWaitlistSize: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageWaitTime: number; // in hours

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageResponseTime: number; // in hours

  // Priority breakdown
  @Column({ type: 'json', nullable: true })
  priorityBreakdown: {
    standard?: {
      joined: number;
      converted: number;
      conversionRate: number;
      averageWaitTime: number;
    };
    vip?: {
      joined: number;
      converted: number;
      conversionRate: number;
      averageWaitTime: number;
    };
    premium?: {
      joined: number;
      converted: number;
      conversionRate: number;
      averageWaitTime: number;
    };
    loyalty?: {
      joined: number;
      converted: number;
      conversionRate: number;
      averageWaitTime: number;
    };
  };

  // Notification metrics
  @Column({ type: 'json', nullable: true })
  notificationMetrics: {
    emailsSent?: number;
    emailsOpened?: number;
    emailsClicked?: number;
    smsSent?: number;
    smsDelivered?: number;
    pushSent?: number;
    pushOpened?: number;
    overallEngagementRate?: number;
  };

  // Revenue impact
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  revenueGenerated: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  potentialRevenueLost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageTicketPrice: number;

  // Demand insights
  @Column({ type: 'json', nullable: true })
  demandInsights: {
    peakJoinHours?: number[];
    popularSections?: string[];
    averageTicketQuantity?: number;
    priceWillingnessDistribution?: {
      range: string;
      count: number;
      percentage: number;
    }[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;
}
