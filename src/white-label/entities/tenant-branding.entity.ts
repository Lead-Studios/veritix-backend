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

export enum BrandingType {
  LOGO = 'logo',
  FAVICON = 'favicon',
  COLOR_SCHEME = 'color_scheme',
  TYPOGRAPHY = 'typography',
  CUSTOM_CSS = 'custom_css',
  EMAIL_TEMPLATE = 'email_template',
  FOOTER = 'footer',
  HEADER = 'header',
}

@Entity()
@Index(['tenantId', 'type'])
export class TenantBranding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BrandingType })
  type: BrandingType;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant, (tenant) => tenant.branding, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
