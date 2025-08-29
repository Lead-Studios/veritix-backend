import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum IntegrationType {
  WEBHOOK = 'webhook',
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  SSO = 'sso',
  PAYMENT_GATEWAY = 'payment_gateway',
  EMAIL_SERVICE = 'email_service',
  SMS_SERVICE = 'sms_service',
  ANALYTICS = 'analytics',
  CRM = 'crm',
  CUSTOM = 'custom',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
}

@Entity()
@Index(['tenantId', 'type'])
@Index(['tenantId', 'status'])
export class TenantIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.PENDING })
  status: IntegrationStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  credentials: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  endpoints: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastErrorAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
