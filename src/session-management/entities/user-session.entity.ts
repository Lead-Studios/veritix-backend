import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
@Index(['userId', 'isActive'])
@Index(['jwtId'])
@Index(['ipAddress'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  jwtId: string; // JWT ID for token invalidation

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  deviceType: string; // mobile, desktop, tablet

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  browserVersion: string;

  @Column({ nullable: true })
  operatingSystem: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp' })
  lastActivityAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  loginMethod: string; // password, google, oauth, etc.

  @Column({ default: false })
  isCurrentSession: boolean; // Mark the current session

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedBy: string; // user, admin, system

  @Column({ nullable: true })
  revokedReason: string;
}
