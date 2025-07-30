import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EngagementType {
  PAGE_VIEW = 'page_view',
  TICKET_VIEW = 'ticket_view',
  SHARE = 'share',
  FAVORITE = 'favorite',
  COMMENT = 'comment',
  REVIEW = 'review',
  NEWSLETTER_SIGNUP = 'newsletter_signup',
  CALENDAR_ADD = 'calendar_add',
  CONTACT_ORGANIZER = 'contact_organizer',
}

@Entity('event_engagements')
@Index(['eventId', 'engagementType', 'createdAt'])
@Index(['userId', 'createdAt'])
export class EventEngagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: EngagementType,
  })
  @Index()
  engagementType: EngagementType;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // Additional data specific to engagement type

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  trafficSource: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  deviceType: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
