import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailDelivery } from './email-delivery.entity';

@Entity('email_clicks')
@Index(['deliveryId', 'clickedAt'])
@Index(['url', 'clickedAt'])
export class EmailClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  deliveryId: string;

  @Column({ type: 'text' })
  @Index()
  url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  linkText: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  linkId: string;

  @Column({ type: 'timestamp' })
  @Index()
  clickedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  operatingSystem: string;

  @Column({ type: 'boolean', default: false })
  isUnique: boolean; // First click on this link by this recipient

  @Column({ type: 'json', nullable: true })
  trackingData: {
    referrer?: string;
    utmParams?: Record<string, string>;
    customParams?: Record<string, any>;
    conversionValue?: number;
    conversionType?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EmailDelivery, (delivery) => delivery.clicks)
  @JoinColumn({ name: 'deliveryId' })
  delivery: EmailDelivery;
}
