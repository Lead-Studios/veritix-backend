import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { LoginAttempt } from './login-attempt.entity';

export enum NotificationType {
  NEW_LOCATION = 'new_location',
  NEW_DEVICE = 'new_device',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  FAILED_LOGIN_ATTEMPTS = 'failed_login_attempts',
  ACCOUNT_LOCKED = 'account_locked',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

@Entity()
@Index(['userId', 'createdAt'])
@Index(['type', 'status'])
export class SecurityNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  recipient: string; // email, phone number, etc.

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => LoginAttempt, (attempt) => attempt.id, { nullable: true, onDelete: 'SET NULL' })
  loginAttempt: LoginAttempt;

  @Column({ nullable: true })
  loginAttemptId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
