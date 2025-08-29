import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiUsage } from './api-usage.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum ApiKeyType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  WEBHOOK = 'webhook',
}

export enum ApiPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

@Entity()
@Index(['keyHash'])
@Index(['tenantId', 'status'])
@Index(['expiresAt'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ unique: true })
  keyHash: string; // Hashed version of the API key

  @Column()
  keyPrefix: string; // First 8 characters for identification

  @Column({ type: 'enum', enum: ApiKeyType, default: ApiKeyType.PRIVATE })
  type: ApiKeyType;

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'json' })
  permissions: ApiPermission[];

  @Column({ type: 'json', nullable: true })
  scopes: string[]; // Specific API endpoints/resources

  @Column({ type: 'json', nullable: true })
  ipWhitelist: string[];

  @Column({ type: 'json', nullable: true })
  domainWhitelist: string[];

  @Column({ default: 1000 })
  rateLimit: number; // Requests per hour

  @Column({ default: 10000 })
  monthlyQuota: number; // Monthly request limit

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  tenantId: string; // Optional tenant association

  @Column({ nullable: true })
  userId: string; // User who created the key

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => ApiUsage, (usage) => usage.apiKey)
  usage: ApiUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
