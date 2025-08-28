import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { TenantBranding } from './tenant-branding.entity';
import { TenantFeature } from './tenant-feature.entity';
import { TenantSubscription } from './tenant-subscription.entity';
import { TenantDomain } from './tenant-domain.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum TenantTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

@Entity()
@Index(['slug'], { unique: true })
@Index(['status', 'tier'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column({ type: 'enum', enum: TenantTier, default: TenantTier.STARTER })
  tier: TenantTier;

  @Column()
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  companyAddress: string;

  @Column({ nullable: true })
  companyCity: string;

  @Column({ nullable: true })
  companyState: string;

  @Column({ nullable: true })
  companyCountry: string;

  @Column({ nullable: true })
  companyZip: string;

  @Column({ nullable: true })
  taxId: string;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt: Date;

  @Column({ nullable: true })
  suspensionReason: string;

  @Column({ default: 0 })
  maxUsers: number;

  @Column({ default: 0 })
  maxEvents: number;

  @Column({ default: 0 })
  maxTickets: number;

  @Column({ default: 0 })
  maxStorage: number; // in MB

  @Column({ default: false })
  customDomainEnabled: boolean;

  @Column({ default: false })
  ssoEnabled: boolean;

  @Column({ default: false })
  apiAccessEnabled: boolean;

  @Column({ default: false })
  whiteLabeling: boolean;

  @Column({ default: false })
  prioritySupport: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 99.9 })
  slaUptime: number;

  @Column({ nullable: true })
  primaryContactId: string;

  @Column({ nullable: true })
  billingContactId: string;

  @OneToMany(() => TenantBranding, (branding) => branding.tenant, { cascade: true })
  branding: TenantBranding[];

  @OneToMany(() => TenantFeature, (feature) => feature.tenant, { cascade: true })
  features: TenantFeature[];

  @OneToMany(() => TenantSubscription, (subscription) => subscription.tenant)
  subscriptions: TenantSubscription[];

  @OneToMany(() => TenantDomain, (domain) => domain.tenant, { cascade: true })
  domains: TenantDomain[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
