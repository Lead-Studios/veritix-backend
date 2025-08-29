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

export enum FeatureCategory {
  CORE = 'core',
  ANALYTICS = 'analytics',
  INTEGRATIONS = 'integrations',
  CUSTOMIZATION = 'customization',
  SUPPORT = 'support',
  BILLING = 'billing',
  SECURITY = 'security',
  API = 'api',
}

@Entity()
@Index(['tenantId', 'featureKey'])
@Index(['featureKey', 'isEnabled'])
export class TenantFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  featureKey: string;

  @Column()
  featureName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: FeatureCategory })
  category: FeatureCategory;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  limits: Record<string, number>;

  @Column({ type: 'timestamp', nullable: true })
  enabledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  enabledBy: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant, (tenant) => tenant.features, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
