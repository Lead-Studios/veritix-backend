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
import { IntelligentWaitlistEntry } from './waitlist-entry.entity';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationTiming {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  CUSTOM = 'custom',
}

@Entity('waitlist_notification_preferences')
@Index(['waitlistEntryId'])
export class WaitlistNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  waitlistEntryId: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ default: true })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: NotificationTiming,
    default: NotificationTiming.IMMEDIATE,
  })
  timing: NotificationTiming;

  @Column({ type: 'int', nullable: true })
  customDelayMinutes: number;

  @Column({ type: 'json', nullable: true })
  channelConfig: {
    email?: {
      address?: string;
      template?: string;
      priority?: 'low' | 'normal' | 'high';
    };
    sms?: {
      phoneNumber?: string;
      countryCode?: string;
      carrier?: string;
    };
    push?: {
      deviceTokens?: string[];
      sound?: string;
      badge?: boolean;
    };
    inApp?: {
      showBadge?: boolean;
      autoMarkRead?: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  notificationTypes: {
    positionUpdate?: boolean;
    ticketAvailable?: boolean;
    priceChange?: boolean;
    eventUpdate?: boolean;
    reminderBeforeExpiry?: boolean;
    finalWarning?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  quietHours: {
    enabled?: boolean;
    startTime?: string; // HH:MM format
    endTime?: string;   // HH:MM format
    timezone?: string;
    weekendsOnly?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => IntelligentWaitlistEntry, entry => entry.notificationPreferences, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'waitlistEntryId' })
  waitlistEntry: IntelligentWaitlistEntry;
}
