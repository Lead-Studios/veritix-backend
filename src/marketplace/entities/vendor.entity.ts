import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VendorProfile } from './vendor-profile.entity';
import { ServiceListing } from './service-listing.entity';
import { ServiceBooking } from './service-booking.entity';
import { VendorReview } from './vendor-review.entity';
import { Commission } from './commission.entity';

export enum VendorStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum VendorTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Entity('vendors')
@Index(['status', 'tier'])
@Index(['createdAt'])
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.PENDING,
  })
  status: VendorStatus;

  @Column({
    type: 'enum',
    enum: VendorTier,
    default: VendorTier.BASIC,
  })
  tier: VendorTier;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  businessName: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  businessRegistrationNumber: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  taxId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  commissionRate: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'json', nullable: true })
  paymentMethods: {
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    paypal?: {
      email: string;
    };
    stripe?: {
      accountId: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  serviceAreas: string[];

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => VendorProfile, (profile) => profile.vendor, {
    cascade: true,
  })
  profile: VendorProfile;

  @OneToMany(() => ServiceListing, (service) => service.vendor)
  services: ServiceListing[];

  @OneToMany(() => ServiceBooking, (booking) => booking.vendor)
  bookings: ServiceBooking[];

  @OneToMany(() => VendorReview, (review) => review.vendor)
  reviews: VendorReview[];

  @OneToMany(() => Commission, (commission) => commission.vendor)
  commissions: Commission[];
}
