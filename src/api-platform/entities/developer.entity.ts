import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiKey } from './api-key.entity';
import { Webhook } from './webhook.entity';

export enum DeveloperStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum DeveloperTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity()
@Index(['email'], { unique: true })
@Index(['status'])
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DeveloperStatus, default: DeveloperStatus.PENDING_VERIFICATION })
  status: DeveloperStatus;

  @Column({ type: 'enum', enum: DeveloperTier, default: DeveloperTier.FREE })
  tier: DeveloperTier;

  @Column({ default: 1000 })
  monthlyQuota: number;

  @Column({ default: 0 })
  currentUsage: number;

  @Column({ default: 0 })
  totalRequests: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.userId)
  apiKeys: ApiKey[];

  @OneToMany(() => Webhook, (webhook) => webhook.tenantId)
  webhooks: Webhook[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
