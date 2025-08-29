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

export enum DomainType {
  SUBDOMAIN = 'subdomain',
  CUSTOM = 'custom',
}

export enum DomainStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

@Entity()
@Index(['domain'], { unique: true })
@Index(['tenantId', 'type'])
export class TenantDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  domain: string;

  @Column({ type: 'enum', enum: DomainType })
  type: DomainType;

  @Column({ type: 'enum', enum: DomainStatus, default: DomainStatus.PENDING })
  status: DomainStatus;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: false })
  sslEnabled: boolean;

  @Column({ nullable: true })
  sslCertificate: string;

  @Column({ type: 'timestamp', nullable: true })
  sslExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ type: 'json', nullable: true })
  dnsRecords: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.domains, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
