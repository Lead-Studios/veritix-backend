import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

export enum LoginMethod {
  EMAIL_PASSWORD = 'email_password',
  GOOGLE_OAUTH = 'google_oauth',
  FACEBOOK_OAUTH = 'facebook_oauth',
  APPLE_OAUTH = 'apple_oauth',
  TWO_FACTOR = 'two_factor',
}

@Entity()
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LoginStatus })
  status: LoginStatus;

  @Column({ type: 'enum', enum: LoginMethod })
  method: LoginMethod;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  deviceType: string; // mobile, desktop, tablet

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  operatingSystem: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  isp: string;

  @Column({ default: false })
  isNewLocation: boolean;

  @Column({ default: false })
  isNewDevice: boolean;

  @Column({ default: false })
  isSuspicious: boolean;

  @Column({ default: false })
  notificationSent: boolean;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
