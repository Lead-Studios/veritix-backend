import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../user/entities/user.entity';
import { AnnouncementDelivery } from './announcement-delivery.entity';

export enum AnnouncementType {
  GENERAL = 'general',
  SCHEDULE_CHANGE = 'schedule_change',
  VENUE_CHANGE = 'venue_change',
  CANCELLATION = 'cancellation',
  SPECIAL_OFFER = 'special_offer',
  REMINDER = 'reminder',
}

export enum AnnouncementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity()
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: AnnouncementType,
    default: AnnouncementType.GENERAL,
  })
  type: AnnouncementType;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.MEDIUM,
  })
  priority: AnnouncementPriority;

  @ManyToOne(() => Event, (event) => event.announcements, {
    onDelete: 'CASCADE',
  })
  @Index()
  event: Event;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdBy: User;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  scheduledAt: Date;

  @Column({ default: false })
  sendEmail: boolean;

  @Column({ default: true })
  sendInApp: boolean;

  @Column({ default: 0 })
  emailSentCount: number;

  @Column({ default: 0 })
  inAppSentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AnnouncementDelivery, (delivery) => delivery.announcement)
  deliveries: AnnouncementDelivery[];
} 