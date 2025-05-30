import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('event_views')
export class EventView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, event => event.views)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ name: 'referrer', nullable: true })
  referrer?: string;

  @Column({ name: 'traffic_source', nullable: true })
  trafficSource?: string; // 'direct', 'social', 'search', 'email', 'referral'

  @CreateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;
}
