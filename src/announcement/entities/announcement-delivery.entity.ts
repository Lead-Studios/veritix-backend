import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from '../../user/entities/user.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

export enum DeliveryMethod {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

@Entity()
export class AnnouncementDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Announcement, (announcement) => announcement.deliveries, {
    onDelete: 'CASCADE',
  })
  @Index()
  announcement: Announcement;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Index()
  user: User;

  @Column({
    type: 'enum',
    enum: DeliveryMethod,
  })
  method: DeliveryMethod;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
} 