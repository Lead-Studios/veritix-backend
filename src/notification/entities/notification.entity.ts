import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { User } from 'src/user/entities/user.entity';

export enum NotificationStatus {
  Unread = 'Unread',
  Read = 'Read',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @Index()
  user: User;

  @ManyToOne(() => Event, (event) => event.notifications, { onDelete: 'CASCADE' })
  @Index()
  event: Event;

  @Column('text')
  message: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.Unread })
  status: NotificationStatus;

  @CreateDateColumn()
  timestamp: Date;
} 