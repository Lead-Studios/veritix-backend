import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('event_views')
@Index(['eventId', 'createdAt'])
export class EventView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  event: Event;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  trafficSource?: string; // 'organic', 'social', 'email', 'referral', 'direct'

  @Column({ nullable: true })
  referrerUrl?: string;

  @Column({ nullable: true })
  utm_source?: string;

  @Column({ nullable: true })
  utm_medium?: string;

  @Column({ nullable: true })
  utm_campaign?: string;

  @CreateDateColumn()
  createdAt: Date;
}
