import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceListing } from './service-listing.entity';

export enum PricingType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  DAILY = 'daily',
  PACKAGE = 'package',
  CUSTOM = 'custom',
}

export enum PricingTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Entity('service_pricing')
@Index(['serviceId', 'isActive'])
export class ServicePricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  serviceId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PricingType,
  })
  pricingType: PricingType;

  @Column({
    type: 'enum',
    enum: PricingTier,
    default: PricingTier.BASIC,
  })
  tier: PricingTier;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumPrice: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'json', nullable: true })
  inclusions: string[];

  @Column({ type: 'json', nullable: true })
  exclusions: string[];

  @Column({ type: 'json', nullable: true })
  addOns: {
    name: string;
    description?: string;
    price: number;
    isRequired?: boolean;
  }[];

  @Column({ type: 'json', nullable: true })
  discounts: {
    type: 'percentage' | 'fixed';
    value: number;
    minQuantity?: number;
    validFrom?: Date;
    validTo?: Date;
    description?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  duration: {
    hours?: number;
    days?: number;
    weeks?: number;
    isFlexible?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  capacity: {
    minGuests?: number;
    maxGuests?: number;
    pricePerGuest?: number;
  };

  @Column({ type: 'json', nullable: true })
  paymentTerms: {
    depositPercentage?: number;
    depositAmount?: number;
    paymentSchedule?: {
      percentage: number;
      dueDate: string;
      description?: string;
    }[];
    cancellationFee?: number;
    lateFeePercentage?: number;
  };

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ServiceListing, (service) => service.pricing)
  @JoinColumn({ name: 'serviceId' })
  service: ServiceListing;
}
