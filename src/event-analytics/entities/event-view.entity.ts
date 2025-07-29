import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('event_views')
@Index(['eventId', 'createdAt'])
@Index(['trafficSource', 'createdAt'])
@Index(['userAgent', 'createdAt'])
export class EventView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string; // null for anonymous users

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  ipAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  trafficSource: string; // organic, social, email, direct, referral, paid

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

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  deviceType: string; // desktop, mobile, tablet

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  browser: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  operatingSystem: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  city: string;

  @Column({ type: 'int', default: 0 })
  timeOnPage: number; // seconds spent on event page

  @Column({ type: 'boolean', default: false })
  @Index()
  convertedToPurchase: boolean;

  @Column({ type: 'uuid', nullable: true })
  purchaseId: string; // links to ticket purchase if converted

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
