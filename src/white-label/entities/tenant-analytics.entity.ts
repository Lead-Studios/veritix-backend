import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum MetricType {
  USAGE = 'usage',
  PERFORMANCE = 'performance',
  BILLING = 'billing',
  FEATURE = 'feature',
  SLA = 'sla',
}

@Entity()
@Index(['tenantId', 'metricName', 'date'])
@Index(['metricType', 'date'])
export class TenantAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metricName: string;

  @Column({ type: 'enum', enum: MetricType })
  metricType: MetricType;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'json', nullable: true })
  dimensions: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
