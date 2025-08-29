import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceListing } from './service-listing.entity';

@Entity('service_categories')
@Index(['isActive'])
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  serviceCount: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    keywords?: string[];
    seoTitle?: string;
    seoDescription?: string;
    customFields?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ServiceCategory, (category) => category.children)
  @JoinColumn({ name: 'parentId' })
  parent: ServiceCategory;

  @OneToMany(() => ServiceCategory, (category) => category.parent)
  children: ServiceCategory[];

  @OneToMany(() => ServiceListing, (service) => service.category)
  services: ServiceListing[];
}
