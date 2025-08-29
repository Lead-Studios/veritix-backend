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

@Entity('email_opens')
@Index(['deliveryId', 'openedAt'])
@Index(['ipAddress', 'userAgent'])
export class EmailOpen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  deliveryId: string;

  @Column({ type: 'timestamp' })
  @Index()
  openedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emailClient: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  operatingSystem: string;

  @Column({ type: 'boolean', default: false })
  isUnique: boolean; // First open by this recipient

  @Column({ type: 'json', nullable: true })
  trackingData: {
    referrer?: string;
    utmParams?: Record<string, string>;
    customParams?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EmailDelivery, (delivery) => delivery.opens)
  @JoinColumn({ name: 'deliveryId' })
  delivery: EmailDelivery;
}
